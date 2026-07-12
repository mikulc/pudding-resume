package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
)

// GetShareSettings handles GET /api/resumes/:id/share (AuthRequired)
// Returns the share settings for a resume, or null if not set up.
func GetShareSettings(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "未登录，请先登录"})
		return
	}

	resumeID := c.Param("id")

	// Verify resume ownership
	var resume models.Resume
	if err := database.DB.Where("id = ? AND user_id = ?", resumeID, userID).First(&resume).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "简历不存在或无权访问"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}

	// Look up existing share settings
	var share models.ResumeShare
	err := database.DB.Where("resume_id = ?", resumeID).First(&share).Error
	if err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusOK, gin.H{"share": nil})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"share": share})
}

// UpdateShareSettings handles PUT /api/resumes/:id/share (AuthRequired)
// Creates or updates share settings for a resume, auto-generating a token on first creation.
func UpdateShareSettings(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "未登录，请先登录"})
		return
	}

	resumeID := c.Param("id")

	// Verify resume ownership
	var resume models.Resume
	if err := database.DB.Where("id = ? AND user_id = ?", resumeID, userID).First(&resume).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "简历不存在或无权访问"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	}

	// Parse request body
	var body struct {
		Permission   *string `json:"permission"`   // "self_only" | "link_anyone"
		AccessLevel  *string `json:"access_level"` // "view" | "edit"
		CanExport    *bool   `json:"can_export"`   // whether visitors can export
		Desensitized *bool   `json:"desensitized"` // whether visitors see redacted personal info
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "请求数据格式错误"})
		return
	}

	// Validate permission
	if body.Permission != nil {
		perm := *body.Permission
		if perm != "self_only" && perm != "link_anyone" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "权限值无效，必须为 self_only 或 link_anyone"})
			return
		}
	}

	// Validate access_level
	if body.AccessLevel != nil {
		al := *body.AccessLevel
		if al != "view" && al != "edit" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "访问级别无效，必须为 view 或 edit"})
			return
		}
	}

	// Upsert share settings
	var share models.ResumeShare
	err := database.DB.Where("resume_id = ?", resumeID).First(&share).Error
	if err == gorm.ErrRecordNotFound {
		// Create new share record with generated token
		token := uuid.New().String()
		share = models.ResumeShare{
			ResumeID:     resumeID,
			UserID:       userID,
			ShareToken:   token,
			Permission:   "self_only",
			AccessLevel:  "view",
			CanExport:    false,
			Desensitized: false,
		}
		if body.Permission != nil {
			share.Permission = *body.Permission
		}
		if body.AccessLevel != nil {
			share.AccessLevel = *body.AccessLevel
		}
		if body.CanExport != nil {
			share.CanExport = *body.CanExport
		}
		if body.Desensitized != nil {
			share.Desensitized = *body.Desensitized
		}
		if createErr := database.DB.Create(&share).Error; createErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "分享设置创建失败"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
		return
	} else {
		// Update existing share record (token stays the same)
		updates := map[string]any{}
		if body.Permission != nil {
			updates["permission"] = *body.Permission
		}
		if body.AccessLevel != nil {
			updates["access_level"] = *body.AccessLevel
		}
		if body.CanExport != nil {
			updates["can_export"] = *body.CanExport
		}
		if body.Desensitized != nil {
			updates["desensitized"] = *body.Desensitized
		}
		if len(updates) > 0 {
			if updateErr := database.DB.Model(&share).Updates(updates).Error; updateErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "分享设置更新失败"})
				return
			}
		}
		// Re-fetch to get latest state
		database.DB.Where("resume_id = ?", resumeID).First(&share)
	}

	c.JSON(http.StatusOK, gin.H{"share": share})
}

// AccessSharedResumeByResumeID handles GET /api/resumes/:id/public (AuthOptional)
// Public access endpoint via resume ID — returns resume content based on share permission.
// Used to serve the same /resume/:id URL to both owners (editor) and shared viewers (read-only preview).
func AccessSharedResumeByResumeID(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		resumeID := c.Param("id")
		userID := middleware.GetUserID(c)

		// Look up share by resume_id
		var share models.ResumeShare
		if err := database.DB.Where("resume_id = ?", resumeID).First(&share).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// Check if the resume was soft-deleted (owner deleted it)
				var resume models.Resume
				if dbErr := database.DB.Unscoped().Where("id = ?", resumeID).First(&resume).Error; dbErr == nil {
					c.JSON(http.StatusNotFound, gin.H{"message": "该简历已被删除"})
					return
				}
				c.JSON(http.StatusNotFound, gin.H{"message": "该简历未公开分享"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
			return
		}

		// Get the associated resume
		var resume models.Resume
		if err := database.DB.Where("id = ?", share.ResumeID).First(&resume).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "该简历已被删除"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器内部错误"})
			return
		}

		isOwner := userID != "" && userID == share.UserID

		// Check permission
		if share.Permission == "self_only" {
			// Only the owner can access
			if !isOwner {
				c.JSON(http.StatusForbidden, gin.H{"message": "该简历未公开分享"})
				return
			}
		}

		// link_anyone: anyone can view. Only the owner can directly edit the
		// original resume; non-owners must copy first.
		canCopyEdit := !isOwner &&
			userID != "" &&
			share.Permission == "link_anyone" &&
			share.AccessLevel == "edit"
		canExport := isOwner || share.CanExport
		content := json.RawMessage(resume.Content)
		if share.Desensitized && !isOwner {
			content = redactResumeContent(resume.Content)
		}

		c.JSON(http.StatusOK, gin.H{
			"resume": gin.H{
				"id":       resume.ID,
				"name":     resume.Name,
				"content":  content,
				"settings": json.RawMessage(resume.Settings),
			},
			"permission":    share.Permission,
			"access_level":  share.AccessLevel,
			"can_edit":      isOwner,
			"can_copy_edit": canCopyEdit,
			"can_export":    canExport,
			"desensitized":  share.Desensitized,
			"owner_id":      share.UserID,
			"is_owner":      isOwner,
		})
	}
}
