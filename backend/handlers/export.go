package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"pudding-resume-backend/services"
)

// validateExportPermission checks whether the current user is allowed to export
// the given resume. Owners can always export; non-owners must have can_export
// enabled on the share settings.
// When resumeID is empty, the request carries self-contained HTML from the
// editor — it does not access any server-side data, so both authenticated
// and unauthenticated users are allowed.  This covers the local-storage
// (offline) use case where no resume has been saved to the server yet.
func validateExportPermission(userID string, resumeID string) (allowed bool, errMsg string) {
	if resumeID == "" {
		// Editor scenario (authenticated or local-storage) — the HTML is
		// provided by the client and doesn't access server-side data.
		return true, ""
	}

	// Check if user is the owner
	var resume models.Resume
	if err := database.DB.Where("id = ?", resumeID).First(&resume).Error; err != nil {
		return false, "简历不存在"
	}
	if userID != "" && resume.UserID == userID {
		return true, ""
	}

	// Non-owner: check share settings
	var share models.ResumeShare
	if err := database.DB.Where("resume_id = ?", resumeID).First(&share).Error; err != nil {
		return false, "该简历未开放分享"
	}
	if share.Permission == "self_only" {
		return false, "该简历未公开分享"
	}
	if !share.CanExport {
		return false, "作者未开放导出权限"
	}
	return true, ""
}

// ExportResumePDF handles POST /api/resumes/export/pdf (optional auth).
// Receives pre-rendered self-contained HTML from the frontend and converts to PDF.
func ExportResumePDF(cfg *config.Config) gin.HandlerFunc {
	return handleExport(cfg, "pdf",
		func(req *services.ExportHTMLRequest, cfg *config.Config) ([]byte, bool, error) {
			return services.ExportResumePDF(req, cfg)
		},
	)
}

// ExportResumePNG handles POST /api/resumes/export/png (optional auth).
// Receives pre-rendered self-contained HTML from the frontend and converts to PNG.
func ExportResumePNG(cfg *config.Config) gin.HandlerFunc {
	return handleExport(cfg, "png",
		func(req *services.ExportHTMLRequest, cfg *config.Config) ([]byte, bool, error) {
			return services.ExportResumePNG(req, cfg)
		},
	)
}

// handleExport is the shared export handler for PDF/PNG. It validates the request,
// checks export permission, calls the generation function, tracks stats, and
// sends the binary response with appropriate headers.
func handleExport(cfg *config.Config, format string,
	generate func(*services.ExportHTMLRequest, *config.Config) ([]byte, bool, error),
) gin.HandlerFunc {
	contentType := "application/pdf"
	fileExt := ".pdf"
	if format == "png" {
		contentType = "image/png"
		fileExt = ".png"
	}

	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		isLoggedIn := userID != ""

		var req services.ExportHTMLRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "请求数据格式错误"})
			return
		}

		if req.HTML == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "HTML 内容不能为空"})
			return
		}

		// Validate export permission when resume_id is provided
		if allowed, errMsg := validateExportPermission(userID, req.ResumeID); !allowed {
			c.JSON(http.StatusForbidden, gin.H{"message": errMsg})
			return
		}

		// Generate output
		data, fontTimedOut, err := generate(&req, cfg)
		if err != nil {
			fmt.Printf("%s export error (userID=%s): %v\n", format, userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"message": strings.ToUpper(format) + " 生成失败，请稍后重试"})
			return
		}

		// Track export stats for logged-in users
		if isLoggedIn {
			database.DB.Model(&models.UserStats{}).
				Where("user_id = ?", userID).
				UpdateColumn("total_exports", gorm.Expr("total_exports + 1"))
			database.DB.Model(&models.UserStats{}).
				Where("user_id = ?", userID).
				UpdateColumn("last_active_at", time.Now())
			UpsertDailyStats(userID, "exports_count", 1)
		}

		filename := req.Filename
		if filename == "" {
			filename = "resume"
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

