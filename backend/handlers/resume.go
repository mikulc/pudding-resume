package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
)

// --- Response types ---

type ResumeResponse struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Content   json.RawMessage `json:"content"`
	Settings  json.RawMessage `json:"settings"`
	UpdatedAt string          `json:"updated_at"`
}

// GetLatestResume handles GET /api/resumes/latest (requires auth)
// Returns the current user's most recently updated resume content, or 404 if none exists.
func GetLatestResume(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "未登录，请先登录"})
		return
	}

	var resume models.Resume
	err := database.DB.Where("user_id = ?", userID).Order("updated_at DESC").First(&resume).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "暂无简历数据"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}

	// Content is already JSONB, return it as-is
	c.JSON(http.StatusOK, ResumeResponse{
		ID:        resume.ID,
		Name:      resume.Name,
		Content:   json.RawMessage(resume.Content),
		Settings:  json.RawMessage(resume.Settings),
		UpdatedAt: resume.UpdatedAt.Format("2006-01-02 15:04:05"),
	})
}

// countResumes returns the number of resumes belonging to the given user.
func countResumes(userID string) (int64, error) {
	var count int64
	err := database.DB.Model(&models.Resume{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

// getUserMaxResumes fetches the user's MaxResumes limit from user_quota, falls back to 10 if not set.
func getUserMaxResumes(userID string) int {
	var quota models.UserQuota
	if err := database.DB.Where("user_id = ?", userID).First(&quota).Error; err != nil {
		return 10
	}
	if quota.MaxResumes <= 0 {
		return 10
	}
	return quota.MaxResumes
}

// incrementResumeStats increments the user's total_resumes_created in user_stats.
func incrementResumeStats(userID string) {
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("total_resumes_created", gorm.Expr("total_resumes_created + 1"))
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("last_active_at", time.Now())
	// Also track daily stats
	UpsertDailyStats(userID, "resumes_created", 1)
}

// incrementEditingTime increments the user's total_editing_seconds in user_stats.
func incrementEditingTime(userID string, seconds int64) {
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("total_editing_seconds", gorm.Expr("total_editing_seconds + ?", seconds))
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("last_active_at", time.Now())
	// Also track daily stats
	UpsertDailyStats(userID, "editing_seconds", seconds)
}

// ListResumes handles GET /api/resumes (requires auth)
// Supports optional limit/offset pagination. Without a limit it keeps returning
// all resumes for backward compatibility.
func ListResumes(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "未登录，请先登录"})
		return
	}

	limit := 0
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "limit must be a positive integer"})
			return
		}
		if parsedLimit > 50 {
			parsedLimit = 50
		}
		limit = parsedLimit
	}

	offset := 0
	if rawOffset := strings.TrimSpace(c.Query("offset")); rawOffset != "" {
		parsedOffset, err := strconv.Atoi(rawOffset)
		if err != nil || parsedOffset < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "offset must be a non-negative integer"})
			return
		}
		offset = parsedOffset
	}

	var total int64
	if err := database.DB.Model(&models.Resume{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}

	var resumes []models.Resume
	query := database.DB.Where("user_id = ?", userID).
		Order("updated_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	if err := query.Find(&resumes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}

	items := make([]models.ResumeListItem, 0, len(resumes))
	for _, r := range resumes {
		items = append(items, models.ResumeListItem{
			ID:        r.ID,
			Name:      r.Name,
			Content:   json.RawMessage(r.Content),
			Settings:  json.RawMessage(r.Settings),
			UpdatedAt: r.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"has_more": limit > 0 && offset+len(items) < int(total),
		"limit":    limit,
		"offset":   offset,
		"resumes":  items,
		"total":    total,
	})
}

// maxResumePhotoBytes is the maximum decoded size (in bytes) for a base64 resume photo.
const maxResumePhotoBytes = 2 * 1024 * 1024 // 2 MB

// validateResumePhotoURL checks the content JSON for an oversized base64 photoUrl.
// Returns an error message string if invalid, or empty string if valid.
func validateResumePhotoURL(content json.RawMessage) string {
	if len(content) == 0 {
		return ""
	}

	var parsed struct {
		PersonalInfo *struct {
			PhotoURL string `json:"photoUrl"`
		} `json:"personalInfo"`
	}
	if err := json.Unmarshal(content, &parsed); err != nil || parsed.PersonalInfo == nil {
		return ""
	}
	photoURL := parsed.PersonalInfo.PhotoURL
	if photoURL == "" {
		return ""
	}

	// Only validate base64 data URLs
	const prefix = "data:image/"
	if !strings.HasPrefix(photoURL, prefix) {
		return ""
	}

	// Find the base64 payload after ";base64,"
	commaIdx := strings.Index(photoURL, ",")
	if commaIdx == -1 {
		return "简历照片格式错误"
	}
	encoded := photoURL[commaIdx+1:]

	// Decode and check size
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		decoded, err = base64.URLEncoding.DecodeString(encoded)
		if err != nil {
			return "简历照片格式错误，无法解析"
		}
	}
	if len(decoded) > maxResumePhotoBytes {
		return fmt.Sprintf("简历照片过大，最大允许 %dMB", maxResumePhotoBytes/(1024*1024))
	}

	return ""
}

// CreateResume handles POST /api/resumes (requires auth)
// Creates a new blank resume for the authenticated user.
func CreateResume(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "未登录，请先登录"})
		return
	}

	// Parse optional name and settings from request body
	var body struct {
		Name     string          `json:"name"`
		Content  json.RawMessage `json:"content"`
		Settings json.RawMessage `json:"settings"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		// If body is empty or malformed, create with defaults
		body.Name = ""
		body.Content = nil
	}

	// Check resume count limit
	maxResumes := getUserMaxResumes(userID)
	count, countErr := countResumes(userID)
	if countErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}
	if count >= int64(maxResumes) {
		c.JSON(http.StatusForbidden, gin.H{"message": fmt.Sprintf("每个用户最多创建 %d 份简历", maxResumes)})
		return
	}

	name := body.Name
	if name == "" {
		name = "未命名简历"
	}

	var content datatypes.JSON
	if len(body.Content) > 0 && body.Content[0] == '{' {
		content = datatypes.JSON(body.Content)
	} else {
		// Default empty resume structure
		content = datatypes.JSON(json.RawMessage(`{"personalInfo":{"fullName":"","phone":"","email":"","photoUrl":""},"education":[],"skills":"","workExperience":[],"projects":[]}`))
	}

	// Validate resume photo size (base64)
	if errMsg := validateResumePhotoURL(body.Content); errMsg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": errMsg})
		return
	}

	var settings datatypes.JSON
	if len(body.Settings) > 0 && body.Settings[0] == '{' {
		settings = datatypes.JSON(body.Settings)
	}

	resume := models.Resume{
		UserID:   userID,
		Name:     name,
		Content:  content,
		Settings: settings,
	}
	if err := database.DB.Create(&resume).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "创建失败，请稍后重试"})
		return
	}

	// Increment stats asynchronously (best-effort)
	go incrementResumeStats(userID)

	c.JSON(http.StatusCreated, ResumeResponse{
		ID:        resume.ID,
		Name:      resume.Name,
		Content:   json.RawMessage(resume.Content),
		Settings:  json.RawMessage(resume.Settings),
		UpdatedAt: resume.UpdatedAt.Format("2006-01-02 15:04:05"),
	})
}

// GetResumeByID handles GET /api/resumes/:id (requires auth)
// Returns a specific resume if it belongs to the authenticated user.
func GetResumeByID(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "未登录，请先登录"})
		return
	}

	id := c.Param("id")

	var resume models.Resume
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&resume).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "简历不存在或无权访问"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}

	c.JSON(http.StatusOK, ResumeResponse{
		ID:        resume.ID,
		Name:      resume.Name,
		Content:   json.RawMessage(resume.Content),
		Settings:  json.RawMessage(resume.Settings),
		UpdatedAt: resume.UpdatedAt.Format("2006-01-02 15:04:05"),
	})
}

// SaveResumeByID handles PUT /api/resumes/:id (requires auth)
// Updates a specific resume if it belongs to the authenticated user.
func SaveResumeByID(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "未登录，请先登录"})
		return
	}

	id := c.Param("id")

	// Parse request body
	var body struct {
		Name     *string         `json:"name"`
		Content  json.RawMessage `json:"content"`
		Settings json.RawMessage `json:"settings"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "请求数据格式错误"})
		return
	}

	// Verify the resume exists and belongs to the user
	var resume models.Resume
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&resume).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "简历不存在或无权访问"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}

	// Build update map
	updates := map[string]any{}
	if body.Name != nil && *body.Name != "" {
		updates["name"] = *body.Name
	}
	if len(body.Content) > 0 && body.Content[0] == '{' {
		// Validate resume photo size (base64)
		if errMsg := validateResumePhotoURL(body.Content); errMsg != "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": errMsg})
			return
		}
		updates["content"] = datatypes.JSON(body.Content)
	}
	if len(body.Settings) > 0 && body.Settings[0] == '{' {
		updates["settings"] = datatypes.JSON(body.Settings)
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "没有需要更新的内容"})
		return
	}

	if err := database.DB.Model(&resume).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "保存失败，请稍后重试"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "保存成功",
		"updated_at": time.Now().Format("2006-01-02 15:04:05"),
	})

	// Increment editing time (best-effort, approx 60s per save)
	go incrementEditingTime(userID, 60)
}

// CopyResume handles POST /api/resumes/:id/copy (requires auth)
// Creates a complete copy of the specified resume with name "原名称 - 副本".
func CopyResume(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "未登录，请先登录"})
		return
	}

	id := c.Param("id")

	// Verify the original resume exists. Owners can copy their own resumes.
	// Non-owners may copy only when the resume is shared as link_anyone + edit.
	var original models.Resume
	if err := database.DB.Where("id = ?", id).First(&original).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "简历不存在或无权访问"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}
	var share models.ResumeShare
	isSharedCopy := false
	if original.UserID != userID {
		if err := database.DB.Where(
			"resume_id = ? AND permission = ? AND access_level = ?",
			id,
			"link_anyone",
			"edit",
		).First(&share).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "简历不存在或无权访问"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
			return
		}
		isSharedCopy = true
	}

	// Generate copy name: "原名称 - 副本"
	copyName := fmt.Sprintf("%s - 副本", original.Name)

	// Check resume count limit
	maxResumes := getUserMaxResumes(userID)
	count, countErr := countResumes(userID)
	if countErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}
	if count >= int64(maxResumes) {
		c.JSON(http.StatusForbidden, gin.H{"message": fmt.Sprintf("每个用户最多创建 %d 份简历", maxResumes)})
		return
	}

	copyContent := original.Content
	if isSharedCopy && share.Desensitized {
		copyContent = datatypes.JSON(redactResumeContent(original.Content))
	}

	copy := models.Resume{
		UserID:   userID,
		Name:     copyName,
		Content:  copyContent,
		Settings: original.Settings,
	}
	if err := database.DB.Create(&copy).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "复制失败，请稍后重试"})
		return
	}

	// Increment stats asynchronously (best-effort)
	go incrementResumeStats(userID)

	c.JSON(http.StatusCreated, ResumeResponse{
		ID:        copy.ID,
		Name:      copy.Name,
		Content:   json.RawMessage(copy.Content),
		Settings:  json.RawMessage(copy.Settings),
		UpdatedAt: copy.UpdatedAt.Format("2006-01-02 15:04:05"),
	})
}

// DeleteResume handles DELETE /api/resumes/:id (requires auth)
func DeleteResume(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "未登录，请先登录"})
			return
		}

		id := c.Param("id")

		// Find the resume and verify ownership
		var resume models.Resume
		result := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&resume)
		if result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "简历不存在或无权操作"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
			return
		}

		// Soft-delete the associated share record (if any)
		database.DB.Where("resume_id = ?", id).Delete(&models.ResumeShare{})

		// Soft-delete the resume
		if err := database.DB.Delete(&resume).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "删除失败，请稍后重试"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "简历已删除"})
	}
}
