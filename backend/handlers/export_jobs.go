package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"pudding-resume-backend/services"
)

type exportJobEvent struct {
	Type         string `json:"type"`
	Stage        string `json:"stage,omitempty"`
	Message      string `json:"message,omitempty"`
	Progress     int    `json:"progress,omitempty"`
	DownloadURL  string `json:"download_url,omitempty"`
	FontTimedOut bool   `json:"font_timed_out,omitempty"`
}

type exportJob struct {
	id          string
	format      string
	filename    string
	userID      string
	contentType string
	fileExt     string
	createdAt   time.Time

	mu           sync.RWMutex
	events       []exportJobEvent
	subscribers  map[chan exportJobEvent]struct{}
	data         []byte
	fontTimedOut bool
	errMessage   string
	completed    bool
}

func (j *exportJob) publish(event exportJobEvent) {
	j.mu.Lock()
	defer j.mu.Unlock()

	if event.Progress < 0 {
		event.Progress = 0
	}
	if event.Progress > 100 {
		event.Progress = 100
	}
	j.events = append(j.events, event)
	for ch := range j.subscribers {
		select {
		case ch <- event:
		default:
		}
	}
}

func (j *exportJob) finish(data []byte, fontTimedOut bool) {
	j.mu.Lock()
	j.data = data
	j.fontTimedOut = fontTimedOut
	j.completed = true
	event := exportJobEvent{
		Type:         "complete",
		Stage:        "complete",
		Message:      strings.ToUpper(j.format) + " 导出完成",
		Progress:     100,
		DownloadURL:  fmt.Sprintf("/api/resumes/export/jobs/%s/download", j.id),
		FontTimedOut: fontTimedOut,
	}
	j.events = append(j.events, event)
	for ch := range j.subscribers {
		select {
		case ch <- event:
		default:
		}
		close(ch)
		delete(j.subscribers, ch)
	}
	j.mu.Unlock()
}

func (j *exportJob) fail(message string) {
	j.mu.Lock()
	j.errMessage = message
	j.completed = true
	event := exportJobEvent{
		Type:     "error",
		Stage:    "error",
		Message:  message,
		Progress: 100,
	}
	j.events = append(j.events, event)
	for ch := range j.subscribers {
		select {
		case ch <- event:
		default:
		}
		close(ch)
		delete(j.subscribers, ch)
	}
	j.mu.Unlock()
}

func (j *exportJob) subscribe() ([]exportJobEvent, chan exportJobEvent) {
	ch := make(chan exportJobEvent, 64)

	j.mu.Lock()
	history := append([]exportJobEvent(nil), j.events...)
	if j.completed {
		close(ch)
	} else {
		j.subscribers[ch] = struct{}{}
	}
	j.mu.Unlock()

	return history, ch
}

func (j *exportJob) unsubscribe(ch chan exportJobEvent) {
	j.mu.Lock()
	if _, exists := j.subscribers[ch]; exists {
		delete(j.subscribers, ch)
		close(ch)
	}
	j.mu.Unlock()
}

type exportJobStore struct {
	mu   sync.RWMutex
	jobs map[string]*exportJob
}

var globalExportJobs = &exportJobStore{jobs: map[string]*exportJob{}}

func (s *exportJobStore) add(job *exportJob) {
	s.mu.Lock()
	s.jobs[job.id] = job
	s.mu.Unlock()
}

func (s *exportJobStore) get(id string) (*exportJob, bool) {
	s.mu.RLock()
	job, ok := s.jobs[id]
	s.mu.RUnlock()
	return job, ok
}

func (s *exportJobStore) removeAfter(id string, ttl time.Duration) {
	time.AfterFunc(ttl, func() {
		s.mu.Lock()
		delete(s.jobs, id)
		s.mu.Unlock()
	})
}

func exportMeta(format string) (contentType string, fileExt string, ok bool) {
	switch format {
	case "pdf":
		return "application/pdf", ".pdf", true
	case "png":
		return "image/png", ".png", true
	default:
		return "", "", false
	}
}

func trackExportStats(userID string) {
	if userID == "" {
		return
	}
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("total_exports", gorm.Expr("total_exports + 1"))
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("last_active_at", time.Now())
	UpsertDailyStats(userID, "exports_count", 1)
}

func StartExportJob(cfg *config.Config, format string) gin.HandlerFunc {
	return func(c *gin.Context) {
		contentType, fileExt, ok := exportMeta(format)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"message": "不支持的导出格式"})
			return
		}

		userID := middleware.GetUserID(c)

		var req services.ExportHTMLRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "请求数据格式错误"})
			return
		}
		if req.HTML == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "HTML 内容不能为空"})
			return
		}
		if allowed, errMsg := validateExportPermission(userID, req.ResumeID); !allowed {
			c.JSON(http.StatusForbidden, gin.H{"message": errMsg})
			return
		}

		filename := req.Filename
		if filename == "" {
			filename = "resume"
		}

		job := &exportJob{
			id:          uuid.NewString(),
			format:      format,
			filename:    filename,
			userID:      userID,
			contentType: contentType,
			fileExt:     fileExt,
			createdAt:   time.Now(),
			subscribers: map[chan exportJobEvent]struct{}{},
		}
		globalExportJobs.add(job)

		go func() {
			job.publish(exportJobEvent{
				Type:     "progress",
				Stage:    "queued",
				Message:  strings.ToUpper(format) + " 导出任务已创建",
				Progress: 3,
			})

			emit := func(progress services.ExportProgress) {
				job.publish(exportJobEvent{
					Type:     "progress",
					Stage:    progress.Stage,
					Message:  progress.Message,
					Progress: progress.Progress,
				})
			}

			var data []byte
			var fontTimedOut bool
			var err error
			if format == "pdf" {
				data, fontTimedOut, err = services.ExportResumePDFWithProgress(&req, cfg, emit)
			} else {
				data, fontTimedOut, err = services.ExportResumePNGWithProgress(&req, cfg, emit)
			}
			if err != nil {
				fmt.Printf("%s export job error (userID=%s, jobID=%s): %v\n", format, userID, job.id, err)
				job.fail(strings.ToUpper(format) + " 生成失败，请稍后重试")
				globalExportJobs.removeAfter(job.id, 3*time.Minute)
				return
			}

			trackExportStats(userID)
			job.finish(data, fontTimedOut)
			globalExportJobs.removeAfter(job.id, 15*time.Minute)
		}()

		c.JSON(http.StatusAccepted, gin.H{
			"job_id":     job.id,
			"events_url": fmt.Sprintf("/api/resumes/export/jobs/%s/events", job.id),
		})
	}
}

func ExportJobEvents() gin.HandlerFunc {
	return func(c *gin.Context) {
		job, ok := globalExportJobs.get(c.Param("id"))
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"message": "导出任务不存在或已过期"})
			return
		}

		userID := middleware.GetUserID(c)
		if job.userID != "" && job.userID != userID {
			c.JSON(http.StatusForbidden, gin.H{"message": "无权访问该导出任务"})
			return
		}

		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("X-Accel-Buffering", "no")

		history, ch := job.subscribe()
		defer job.unsubscribe(ch)

		for _, event := range history {
			c.SSEvent(event.Type, event)
			c.Writer.Flush()
		}

		c.Stream(func(w io.Writer) bool {
			event, ok := <-ch
			if !ok {
				return false
			}
			c.SSEvent(event.Type, event)
			return true
		})
	}
}

func DownloadExportJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		job, ok := globalExportJobs.get(c.Param("id"))
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"message": "导出任务不存在或已过期"})
			return
		}

		userID := middleware.GetUserID(c)
		if job.userID != "" && job.userID != userID {
			c.JSON(http.StatusForbidden, gin.H{"message": "无权访问该导出任务"})
			return
		}

		job.mu.RLock()
		data := append([]byte(nil), job.data...)
		contentType := job.contentType
		fileExt := job.fileExt
		filename := job.filename
		fontTimedOut := job.fontTimedOut
		errMessage := job.errMessage
		completed := job.completed
		job.mu.RUnlock()

		if errMessage != "" {
			c.JSON(http.StatusInternalServerError, gin.H{"message": errMessage})
			return
		}
		if !completed || len(data) == 0 {
			c.JSON(http.StatusConflict, gin.H{"message": "导出任务尚未完成"})
			return
		}

		if fontTimedOut {
			c.Header("X-Font-Status", "timeout")
		}
		c.Header("Content-Type", contentType)
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename*=UTF-8''%s%s`, url.PathEscape(filename), fileExt))
		c.Header("Content-Length", fmt.Sprintf("%d", len(data)))
		c.Data(http.StatusOK, contentType, data)
	}
}
