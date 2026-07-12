package handlers

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"pudding-resume-backend/utils"
)

// --- Request / Response types ---

type UpdateProfileRequest struct {
	Username string `json:"username" binding:"required"`
}

type UserProfileResponse struct {
	ID                 string `json:"id"`
	Username           string `json:"username"`
	Email              string `json:"email"`
	Avatar             string `json:"avatar"`
	Role               string `json:"role"`
	MaxResumes         int    `json:"max_resumes"`
	UsedResumes        int64  `json:"used_resumes"`
	ExportCount        int    `json:"export_count"`
	DailyLimitTokens   int    `json:"daily_limit_tokens"`
	MonthlyLimitTokens int    `json:"monthly_limit_tokens"`
	AutoSaveInterval   int    `json:"auto_save_interval"`
	AiPolishEnabled    bool   `json:"ai_polish_enabled"`
	ThemeMode          string `json:"theme_mode"`
	Language           string `json:"language"`
	AiServiceApiUrl    string `json:"ai_service_api_url"`
	AiServiceApiKey    string `json:"ai_service_api_key"`
	AiServiceModel     string `json:"ai_service_model"`
	AiServicePrompt    string `json:"ai_service_prompt"`
	ModelSource        string `json:"model_source"`
	PublicModelID      string `json:"public_model_id"`
	// Live2D preferences
	Live2dEnabled                        bool    `json:"live2d_enabled"`
	Live2dPosition                       string  `json:"live2d_position"`
	Live2dHOffset                        int     `json:"live2d_h_offset"`
	Live2dVOffset                        int     `json:"live2d_v_offset"`
	Live2dWidth                          int     `json:"live2d_width"`
	Live2dHeight                         int     `json:"live2d_height"`
	Live2dScale                          float64 `json:"live2d_scale"`
	Live2dOpacity                        float64 `json:"live2d_opacity"`
	Live2dShowEditor                     bool    `json:"live2d_show_editor"`
	Live2dMobileShow                     bool    `json:"live2d_mobile_show"`
	Live2dEnablePointerEventsPassThrough bool    `json:"live2d_enable_pointer_events_pass_through"`
	Live2dPeekVisibleRatio               float64 `json:"live2d_peek_visible_ratio"`
	Live2dNearbyRetractRatio             float64 `json:"live2d_nearby_retract_ratio"`
	Live2dNearbyBehavior                 string  `json:"live2d_nearby_behavior"`
	Live2dProximityThreshold             int     `json:"live2d_proximity_threshold"`
	Live2dRestoreDelay                   int     `json:"live2d_restore_delay"`
	Live2dTransitionDuration             int     `json:"live2d_transition_duration"`
	Live2dPinned                         bool    `json:"live2d_pinned"`
	LocalStorageEnabled                  bool    `json:"local_storage_enabled"`
	LocalStoragePath                     string  `json:"local_storage_path"`
	ExportJsonWithSettings               bool    `json:"export_json_with_settings"`
	QuotaUpdatedAt                       string  `json:"quota_updated_at"`
	CreatedAt                            string  `json:"created_at"`
	LastLoginAt                          string  `json:"last_login_at"`
}

type UpdatePreferencesRequest struct {
	AutoSaveInterval *int    `json:"auto_save_interval"`
	AiPolishEnabled  *bool   `json:"ai_polish_enabled"`
	ThemeMode        *string `json:"theme_mode"`
	Language         *string `json:"language"`
	AiServiceApiUrl  *string `json:"ai_service_api_url"`
	AiServiceApiKey  *string `json:"ai_service_api_key"`
	AiServiceModel   *string `json:"ai_service_model"`
	AiServicePrompt  *string `json:"ai_service_prompt"`
	ModelSource      *string `json:"model_source"`
	PublicModelID    *string `json:"public_model_id"`
	// Live2D preferences (pointer for partial update)
	Live2dEnabled                        *bool    `json:"live2d_enabled"`
	Live2dPosition                       *string  `json:"live2d_position"`
	Live2dHOffset                        *int     `json:"live2d_h_offset"`
	Live2dVOffset                        *int     `json:"live2d_v_offset"`
	Live2dWidth                          *int     `json:"live2d_width"`
	Live2dHeight                         *int     `json:"live2d_height"`
	Live2dScale                          *float64 `json:"live2d_scale"`
	Live2dOpacity                        *float64 `json:"live2d_opacity"`
	Live2dShowEditor                     *bool    `json:"live2d_show_editor"`
	Live2dMobileShow                     *bool    `json:"live2d_mobile_show"`
	Live2dEnablePointerEventsPassThrough *bool    `json:"live2d_enable_pointer_events_pass_through"`
	Live2dPeekVisibleRatio               *float64 `json:"live2d_peek_visible_ratio"`
	Live2dNearbyRetractRatio             *float64 `json:"live2d_nearby_retract_ratio"`
	Live2dNearbyBehavior                 *string  `json:"live2d_nearby_behavior"`
	Live2dProximityThreshold             *int     `json:"live2d_proximity_threshold"`
	Live2dRestoreDelay                   *int     `json:"live2d_restore_delay"`
	Live2dTransitionDuration             *int     `json:"live2d_transition_duration"`
	Live2dPinned                         *bool    `json:"live2d_pinned"`
	// 本地存储偏好
	LocalStorageEnabled *bool   `json:"local_storage_enabled"`
	LocalStoragePath    *string `json:"local_storage_path"`
	// 导出偏好
	ExportJsonWithSettings *bool `json:"export_json_with_settings"`
}

type AvatarResponse struct {
	AvatarURL string `json:"avatar_url"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

// --- Helpers ---

func normalizeThemeMode(mode string) string {
	switch mode {
	case "light", "dark", "system":
		return mode
	default:
		return "system"
	}
}

func normalizeLanguage(lang string) string {
	switch lang {
	case "zh-CN", "en-US":
		return lang
	default:
		return "zh-CN"
	}
}

// buildAvatarURL constructs the full URL for an avatar path.
func buildAvatarURL(avatarPath string) string {
	if avatarPath == "" {
		return ""
	}
	// avatarPath is stored as relative, e.g. "avatars/uuid.jpg"
	return "/api/" + strings.ReplaceAll(avatarPath, "\\", "/")
}

// formatUserProfile converts a User model to the profile response format.
func formatUserProfile(user *models.User) UserProfileResponse {
	// Count user's current resumes
	var usedResumes int64
	database.DB.Model(&models.Resume{}).Where("user_id = ?", user.ID).Count(&usedResumes)

	// Fetch quota data
	var quota models.UserQuota
	database.DB.Where("user_id = ?", user.ID).First(&quota)

	// Fetch preference data
	var pref models.UserPreference
	database.DB.Where("user_id = ?", user.ID).First(&pref)

	// Fetch AI fill config
	var aifc models.AIServiceConfig
	database.DB.Where("user_id = ?", user.ID).First(&aifc)

	return UserProfileResponse{
		ID:                 user.ID,
		Username:           user.Username,
		Email:              user.Email,
		Avatar:             buildAvatarURL(user.Avatar),
		Role:               user.Role,
		MaxResumes:         quota.MaxResumes,
		UsedResumes:        usedResumes,
		ExportCount:        quota.ExportCount,
		DailyLimitTokens:   quota.DailyLimitTokens,
		MonthlyLimitTokens: quota.MonthlyLimitTokens,
		AutoSaveInterval:   pref.AutoSaveInterval,
		AiPolishEnabled:    pref.AiPolishEnabled,
		ThemeMode:          normalizeThemeMode(pref.ThemeMode),
		Language:           normalizeLanguage(pref.Language),
		AiServiceApiUrl:    aifc.ApiUrl,
		AiServiceApiKey:    aifc.ApiKey,
		AiServiceModel:     aifc.Model,
		AiServicePrompt:    aifc.Prompt,
		ModelSource:        aifc.ModelSource,
		PublicModelID: func() string {
			if aifc.PublicModelID != nil {
				return *aifc.PublicModelID
			}
			return ""
		}(),
		Live2dEnabled:                        pref.Live2dEnabled,
		Live2dPosition:                       pref.Live2dPosition,
		Live2dHOffset:                        pref.Live2dHOffset,
		Live2dVOffset:                        pref.Live2dVOffset,
		Live2dWidth:                          pref.Live2dWidth,
		Live2dHeight:                         pref.Live2dHeight,
		Live2dScale:                          pref.Live2dScale,
		Live2dOpacity:                        pref.Live2dOpacity,
		Live2dShowEditor:                     pref.Live2dShowEditor,
		Live2dMobileShow:                     pref.Live2dMobileShow,
		Live2dEnablePointerEventsPassThrough: pref.Live2dEnablePointerEventsPassThrough,
		Live2dPeekVisibleRatio:               pref.Live2dPeekVisibleRatio,
		Live2dNearbyRetractRatio:             pref.Live2dNearbyRetractRatio,
		Live2dNearbyBehavior:                 pref.Live2dNearbyBehavior,
		Live2dProximityThreshold:             pref.Live2dProximityThreshold,
		Live2dRestoreDelay:                   pref.Live2dRestoreDelay,
		Live2dTransitionDuration:             pref.Live2dTransitionDuration,
		Live2dPinned:                         pref.Live2dPinned,
		LocalStorageEnabled:                  pref.LocalStorageEnabled,
		LocalStoragePath:                     pref.LocalStoragePath,
		ExportJsonWithSettings:               pref.ExportJsonWithSettings,
		QuotaUpdatedAt: func() string {
			if !quota.UpdatedAt.IsZero() {
				return quota.UpdatedAt.Format("2006-01-02 15:04")
			}
			return ""
		}(),
		CreatedAt: user.CreatedAt.Format("2006-01-02 15:04"),
		LastLoginAt: func() string {
			if user.LastLoginAt != nil {
				return user.LastLoginAt.Format("2006-01-02 15:04")
			}
			return ""
		}(),
	}
}

// --- Handlers ---

// GetProfile handles GET /api/user/profile (requires auth)
func GetProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		respondError(c, http.StatusUnauthorized, "未登录，请先登录")
		return
	}

	var user models.User
	result := database.DB.Where("id = ?", userID).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			respondError(c, http.StatusNotFound, "用户不存在")
		} else {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
		}
		return
	}

	c.JSON(http.StatusOK, formatUserProfile(&user))
}

// UpdateProfile handles PUT /api/user/profile (requires auth)
func UpdateProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		respondError(c, http.StatusUnauthorized, "未登录，请先登录")
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请提供用户名")
		return
	}

	// Validate username length
	usernameLen := utf8.RuneCountInString(req.Username)
	if usernameLen < 2 || usernameLen > 10 {
		respondError(c, http.StatusBadRequest, "用户名长度需在 2-10 个字符之间")
		return
	}

	// Check if username is already taken by another user
	var existingUser models.User
	result := database.DB.Where("username = ? AND id != ?", req.Username, userID).First(&existingUser)
	if result.Error == nil {
		respondError(c, http.StatusConflict, "该用户名已被使用")
		return
	} else if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}

	// Update username
	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("username", req.Username).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "更新失败，请稍后重试")
		return
	}

	// Return updated profile
	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}

	c.JSON(http.StatusOK, formatUserProfile(&user))
}

// --- Avatar upload constraints ---

const maxAvatarSize = 2 << 20 // 2 MB

// UploadAvatar handles POST /api/user/avatar (requires auth)
func UploadAvatar(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		if userID == "" {
			respondError(c, http.StatusUnauthorized, "未登录，请先登录")
			return
		}

		// Read the file from the form field "avatar"
		file, header, err := c.Request.FormFile("avatar")
		if err != nil {
			respondError(c, http.StatusBadRequest, "请选择要上传的头像文件")
			return
		}
		defer file.Close()

		// --- Server-side validation ---

		// 1. File size check (< 2MB)
		if header.Size > maxAvatarSize {
			respondError(c, http.StatusBadRequest, "文件大小不能超过 2MB")
			return
		}

		// 2. File signature check. Do not trust the multipart Content-Type:
		// clients can spoof it, so the backend must validate the actual bytes.
		ext, allowed := detectImageType(file)
		if !allowed {
			respondError(c, http.StatusBadRequest, "仅支持 JPG、PNG、WEBP 格式的图片")
			return
		}
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			respondError(c, http.StatusBadRequest, "无法读取上传文件")
			return
		}

		// --- Save the file ---

		// Ensure upload directory exists
		avatarDir := filepath.Join(cfg.UploadDir, "avatars")
		if err := os.MkdirAll(avatarDir, 0755); err != nil {
			respondError(c, http.StatusInternalServerError, "服务器配置错误，无法创建上传目录")
			return
		}

		// Generate a unique filename: UUID + original extension
		newFileName := uuid.New().String() + ext
		destPath := filepath.Join(avatarDir, newFileName)

		// Save the file to disk
		dst, err := os.Create(destPath)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "文件保存失败")
			return
		}
		defer dst.Close()

		written, err := io.Copy(dst, io.LimitReader(file, maxAvatarSize+1))
		if err != nil {
			respondError(c, http.StatusInternalServerError, "文件写入失败")
			return
		}
		if written > maxAvatarSize {
			os.Remove(destPath)
			respondError(c, http.StatusBadRequest, "文件大小不能超过 2MB")
			return
		}

		// --- Delete old avatar file (if any) ---
		var oldUser models.User
		if err := database.DB.Where("id = ?", userID).First(&oldUser).Error; err == nil && oldUser.Avatar != "" {
			oldPath := filepath.Join(cfg.UploadDir, oldUser.Avatar)
			// Best-effort: ignore errors on cleanup
			os.Remove(oldPath)
		}

		// --- Update the user's avatar in the database ---
		avatarRelativePath := filepath.Join("avatars", newFileName)
		if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("avatar", avatarRelativePath).Error; err != nil {
			// If DB update fails, clean up the uploaded file
			os.Remove(destPath)
			respondError(c, http.StatusInternalServerError, "头像信息更新失败，请稍后重试")
			return
		}

		// Return the avatar URL
		c.JSON(http.StatusOK, AvatarResponse{
			AvatarURL: buildAvatarURL(avatarRelativePath),
		})
	}
}

// ChangePassword handles PUT /api/user/password (requires auth)
func ChangePassword(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		respondError(c, http.StatusUnauthorized, "未登录，请先登录")
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请提供旧密码和新密码")
		return
	}

	// Validate new password length
	if len(req.NewPassword) < 6 {
		respondError(c, http.StatusBadRequest, "新密码长度不能少于 6 位")
		return
	}

	// Fetch user with password
	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}

	// Verify old password
	if !utils.CheckPassword(req.OldPassword, user.Password) {
		respondError(c, http.StatusBadRequest, "原密码错误")
		return
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}

	// Update password AND increment token_version (invalidate all existing sessions)
	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]any{
		"password":      hashedPassword,
		"token_version": gorm.Expr("token_version + 1"),
	}).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "密码修改失败，请稍后重试")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "密码修改成功，所有设备已退出登录，请重新登录"})
}

// DeleteAvatar handles DELETE /api/user/avatar (requires auth)
func DeleteAvatar(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		if userID == "" {
			respondError(c, http.StatusUnauthorized, "未登录，请先登录")
			return
		}

		var user models.User
		if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		// Delete file if exists
		if user.Avatar != "" {
			oldPath := filepath.Join(cfg.UploadDir, user.Avatar)
			os.Remove(oldPath) // best-effort, ignore errors
		}

		// Clear avatar field in database
		if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("avatar", "").Error; err != nil {
			respondError(c, http.StatusInternalServerError, "操作失败，请稍后重试")
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "头像已恢复为默认"})
	}
}

// detectImageType reads the first 512 bytes of a file to detect its image type.
// Returns the extension and whether the type is supported.
func detectImageType(file multipart.File) (string, bool) {
	header := make([]byte, 512)
	n, _ := file.Read(header)

	// Reset seek position if possible
	if seeker, ok := file.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	if n == 0 {
		return "", false
	}

	contentType := http.DetectContentType(header[:n])
	switch {
	case strings.HasPrefix(contentType, "image/jpeg"):
		return ".jpg", true
	case strings.HasPrefix(contentType, "image/png"):
		return ".png", true
	case n >= 12 &&
		string(header[0:4]) == "RIFF" &&
		string(header[8:12]) == "WEBP":
		return ".webp", true
	default:
		return "", false
	}
}

// GetPreferences handles GET /api/user/preferences (requires auth)
func GetPreferences(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		respondError(c, http.StatusUnauthorized, "未登录，请先登录")
		return
	}

	var pref models.UserPreference
	if err := database.DB.Where("user_id = ?", userID).First(&pref).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}

	// Fetch AI fill config
	var aifc models.AIServiceConfig
	database.DB.Where("user_id = ?", userID).First(&aifc)

	c.JSON(http.StatusOK, gin.H{
		"auto_save_interval": pref.AutoSaveInterval,
		"ai_polish_enabled":  pref.AiPolishEnabled,
		"theme_mode":         normalizeThemeMode(pref.ThemeMode),
		"language":           normalizeLanguage(pref.Language),
		"ai_service_api_url": aifc.ApiUrl,
		"ai_service_api_key": aifc.ApiKey,
		"ai_service_model":   aifc.Model,
		"ai_service_prompt":  aifc.Prompt,
		"model_source":       aifc.ModelSource,
		"public_model_id": func() string {
			if aifc.PublicModelID != nil {
				return *aifc.PublicModelID
			}
			return ""
		}(),
		"live2d_enabled":     pref.Live2dEnabled,
		"live2d_position":    pref.Live2dPosition,
		"live2d_h_offset":    pref.Live2dHOffset,
		"live2d_v_offset":    pref.Live2dVOffset,
		"live2d_width":       pref.Live2dWidth,
		"live2d_height":      pref.Live2dHeight,
		"live2d_scale":       pref.Live2dScale,
		"live2d_opacity":     pref.Live2dOpacity,
		"live2d_show_editor": pref.Live2dShowEditor,
		"live2d_mobile_show": pref.Live2dMobileShow,
		"live2d_enable_pointer_events_pass_through": pref.Live2dEnablePointerEventsPassThrough,
		"live2d_peek_visible_ratio":                 pref.Live2dPeekVisibleRatio,
		"live2d_nearby_retract_ratio":               pref.Live2dNearbyRetractRatio,
		"live2d_nearby_behavior":                    pref.Live2dNearbyBehavior,
		"live2d_proximity_threshold":                pref.Live2dProximityThreshold,
		"live2d_restore_delay":                      pref.Live2dRestoreDelay,
		"live2d_transition_duration":                pref.Live2dTransitionDuration,
		"live2d_pinned":                             pref.Live2dPinned,
		"local_storage_enabled":                     pref.LocalStorageEnabled,
		"local_storage_path":                        pref.LocalStoragePath,
		"export_json_with_settings":                 pref.ExportJsonWithSettings,
	})
}

// UpdatePreferences handles PUT /api/user/preferences (requires auth)
func UpdatePreferences(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		respondError(c, http.StatusUnauthorized, "未登录，请先登录")
		return
	}

	var req UpdatePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	updates := map[string]any{}
	aiUpdates := map[string]any{} // AI fill fields go to ai_service_config table

	if req.AutoSaveInterval != nil {
		// Validate: only allow specific values
		interval := *req.AutoSaveInterval
		validIntervals := map[int]bool{0: true, 30: true, 60: true, 120: true, 300: true}
		if !validIntervals[interval] {
			respondError(c, http.StatusBadRequest, "无效的自动保存间隔，可选值：0（关闭）/ 30 / 60 / 120 / 300")
			return
		}
		updates["auto_save_interval"] = interval
	}

	if req.AiPolishEnabled != nil {
		updates["ai_polish_enabled"] = *req.AiPolishEnabled
	}

	if req.ThemeMode != nil {
		mode := normalizeThemeMode(*req.ThemeMode)
		if mode != *req.ThemeMode {
			respondError(c, http.StatusBadRequest, "主题模式仅支持 light / dark / system")
			return
		}
		updates["theme_mode"] = mode
	}

	if req.Language != nil {
		lang := normalizeLanguage(*req.Language)
		if lang != *req.Language {
			respondError(c, http.StatusBadRequest, "界面语言仅支持 zh-CN / en-US")
			return
		}
		updates["language"] = lang
	}

	if req.AiServiceApiUrl != nil {
		// Basic URL validation: allow empty string or valid URL
		if *req.AiServiceApiUrl != "" {
			if !strings.HasPrefix(*req.AiServiceApiUrl, "http://") && !strings.HasPrefix(*req.AiServiceApiUrl, "https://") {
				respondError(c, http.StatusBadRequest, "API 地址需以 http:// 或 https:// 开头")
				return
			}
		}
		aiUpdates["api_url"] = *req.AiServiceApiUrl
	}

	if req.AiServiceApiKey != nil {
		aiUpdates["api_key"] = *req.AiServiceApiKey
	}

	if req.AiServiceModel != nil {
		aiUpdates["model"] = *req.AiServiceModel
	}

	if req.AiServicePrompt != nil {
		aiUpdates["prompt"] = *req.AiServicePrompt
	}

	if req.ModelSource != nil {
		// Validate: only "custom" or "public"
		if *req.ModelSource != "custom" && *req.ModelSource != "public" {
			respondError(c, http.StatusBadRequest, "模型来源仅支持 custom 或 public")
			return
		}
		aiUpdates["model_source"] = *req.ModelSource
	}

	if req.PublicModelID != nil {
		if *req.PublicModelID == "" {
			aiUpdates["public_model_id"] = nil
		} else {
			// Validate the public model exists and is active
			var pool models.AIModelPool
			if err := database.DB.Where("id = ? AND is_active = true", *req.PublicModelID).First(&pool).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					respondError(c, http.StatusBadRequest, "所选公共模型不存在或已禁用")
				} else {
					respondError(c, http.StatusInternalServerError, "服务器内部错误")
				}
				return
			}
			aiUpdates["public_model_id"] = *req.PublicModelID
		}
	}

	if req.Live2dEnabled != nil {
		updates["live2d_enabled"] = *req.Live2dEnabled
	}
	if req.Live2dPosition != nil {
		p := *req.Live2dPosition
		validPositions := map[string]bool{"left": true, "right": true, "bottom": true, "right-bottom": true}
		if !validPositions[p] {
			respondError(c, http.StatusBadRequest, "看板娘位置仅支持 left、right、bottom 或 right-bottom")
			return
		}
		updates["live2d_position"] = p
	}
	if req.Live2dHOffset != nil {
		updates["live2d_h_offset"] = *req.Live2dHOffset
	}
	if req.Live2dVOffset != nil {
		updates["live2d_v_offset"] = *req.Live2dVOffset
	}
	if req.Live2dWidth != nil {
		if *req.Live2dWidth < 50 || *req.Live2dWidth > 500 {
			respondError(c, http.StatusBadRequest, "看板娘宽度需在 50~500 之间")
			return
		}
		updates["live2d_width"] = *req.Live2dWidth
	}
	if req.Live2dHeight != nil {
		if *req.Live2dHeight < 50 || *req.Live2dHeight > 500 {
			respondError(c, http.StatusBadRequest, "看板娘高度需在 50~500 之间")
			return
		}
		updates["live2d_height"] = *req.Live2dHeight
	}
	if req.Live2dScale != nil {
		if *req.Live2dScale < 0.1 || *req.Live2dScale > 3 {
			respondError(c, http.StatusBadRequest, "看板娘缩放比例需在 0.1~3 之间")
			return
		}
		updates["live2d_scale"] = *req.Live2dScale
	}
	if req.Live2dOpacity != nil {
		if *req.Live2dOpacity < 0 || *req.Live2dOpacity > 1 {
			respondError(c, http.StatusBadRequest, "看板娘透明度需在 0~1 之间")
			return
		}
		updates["live2d_opacity"] = *req.Live2dOpacity
	}

	if req.Live2dShowEditor != nil {
		updates["live2d_show_editor"] = *req.Live2dShowEditor
	}

	if req.Live2dMobileShow != nil {
		updates["live2d_mobile_show"] = *req.Live2dMobileShow
	}

	if req.Live2dEnablePointerEventsPassThrough != nil {
		updates["live2d_enable_pointer_events_pass_through"] = *req.Live2dEnablePointerEventsPassThrough
	}
	if req.Live2dPeekVisibleRatio != nil {
		if *req.Live2dPeekVisibleRatio < 0.05 || *req.Live2dPeekVisibleRatio > 1 {
			respondError(c, http.StatusBadRequest, "看板娘出来比例需在 0.05~1 之间")
			return
		}
		updates["live2d_peek_visible_ratio"] = *req.Live2dPeekVisibleRatio
	}
	if req.Live2dNearbyRetractRatio != nil {
		if *req.Live2dNearbyRetractRatio < 0.05 || *req.Live2dNearbyRetractRatio > 1 {
			respondError(c, http.StatusBadRequest, "看板娘探头比例需在 0.05~1 之间")
			return
		}
		updates["live2d_nearby_retract_ratio"] = *req.Live2dNearbyRetractRatio
	}
	if req.Live2dNearbyBehavior != nil {
		behavior := *req.Live2dNearbyBehavior
		if behavior != "expand" && behavior != "retract" {
			respondError(c, http.StatusBadRequest, "看板娘靠近行为仅支持 expand 或 retract")
			return
		}
		updates["live2d_nearby_behavior"] = behavior
	}
	if req.Live2dProximityThreshold != nil {
		if *req.Live2dProximityThreshold < 0 || *req.Live2dProximityThreshold > 320 {
			respondError(c, http.StatusBadRequest, "看板娘靠近触发距离需在 0~320px 之间")
			return
		}
		updates["live2d_proximity_threshold"] = *req.Live2dProximityThreshold
	}
	if req.Live2dRestoreDelay != nil {
		if *req.Live2dRestoreDelay < 0 || *req.Live2dRestoreDelay > 2000 {
			respondError(c, http.StatusBadRequest, "看板娘恢复延迟需在 0~2000ms 之间")
			return
		}
		updates["live2d_restore_delay"] = *req.Live2dRestoreDelay
	}
	if req.Live2dTransitionDuration != nil {
		if *req.Live2dTransitionDuration < 100 || *req.Live2dTransitionDuration > 1000 {
			respondError(c, http.StatusBadRequest, "看板娘动画时长需在 100~1000ms 之间")
			return
		}
		updates["live2d_transition_duration"] = *req.Live2dTransitionDuration
	}
	if req.Live2dPinned != nil {
		updates["live2d_pinned"] = *req.Live2dPinned
	}

	// 本地存储偏好
	if req.LocalStorageEnabled != nil {
		updates["local_storage_enabled"] = *req.LocalStorageEnabled
	}
	if req.LocalStoragePath != nil {
		updates["local_storage_path"] = *req.LocalStoragePath
	}

	// 导出偏好
	if req.ExportJsonWithSettings != nil {
		updates["export_json_with_settings"] = *req.ExportJsonWithSettings
	}

	if len(updates) == 0 && len(aiUpdates) == 0 {
		respondError(c, http.StatusBadRequest, "请至少提供一项偏好设置")
		return
	}

	// Update user_preference table (non-AI fields)
	if len(updates) > 0 {
		if err := database.DB.Model(&models.UserPreference{}).Where("user_id = ?", userID).Updates(updates).Error; err != nil {
			respondError(c, http.StatusInternalServerError, "偏好设置更新失败，请稍后重试")
			return
		}
	}

	// Update ai_service_config table (AI fill fields)
	if len(aiUpdates) > 0 {
		// Upsert: create if not exists, update if exists
		var aifc models.AIServiceConfig
		result := database.DB.Where("user_id = ?", userID).First(&aifc)
		if result.Error != nil {
			if errors.Is(result.Error, gorm.ErrRecordNotFound) {
				// Create new record
				aifc = models.AIServiceConfig{UserID: userID}
				for k, v := range aiUpdates {
					switch k {
					case "api_url":
						aifc.ApiUrl = v.(string)
					case "api_key":
						aifc.ApiKey = v.(string)
					case "model":
						aifc.Model = v.(string)
					case "prompt":
						aifc.Prompt = v.(string)
					case "model_source":
						aifc.ModelSource = v.(string)
					case "public_model_id":
						if v == nil {
							aifc.PublicModelID = nil
						} else if sid, ok := v.(string); ok {
							if sid == "" {
								aifc.PublicModelID = nil
							} else {
								aifc.PublicModelID = &sid
							}
						}
					}
				}
				if err := database.DB.Create(&aifc).Error; err != nil {
					respondError(c, http.StatusInternalServerError, "AI 配置保存失败，请稍后重试")
					return
				}
			} else {
				respondError(c, http.StatusInternalServerError, "服务器内部错误")
				return
			}
		} else {
			if err := database.DB.Model(&models.AIServiceConfig{}).Where("user_id = ?", userID).Updates(aiUpdates).Error; err != nil {
				respondError(c, http.StatusInternalServerError, "AI 配置更新失败，请稍后重试")
				return
			}
		}
	}

	// Return updated preferences
	var pref models.UserPreference
	database.DB.Where("user_id = ?", userID).First(&pref)
	var aifc models.AIServiceConfig
	database.DB.Where("user_id = ?", userID).First(&aifc)

	c.JSON(http.StatusOK, gin.H{
		"auto_save_interval": pref.AutoSaveInterval,
		"ai_polish_enabled":  pref.AiPolishEnabled,
		"theme_mode":         normalizeThemeMode(pref.ThemeMode),
		"language":           normalizeLanguage(pref.Language),
		"ai_service_api_url": aifc.ApiUrl,
		"ai_service_api_key": aifc.ApiKey,
		"ai_service_model":   aifc.Model,
		"ai_service_prompt":  aifc.Prompt,
		"model_source":       aifc.ModelSource,
		"public_model_id": func() string {
			if aifc.PublicModelID != nil {
				return *aifc.PublicModelID
			}
			return ""
		}(),
		"live2d_enabled":     pref.Live2dEnabled,
		"live2d_position":    pref.Live2dPosition,
		"live2d_h_offset":    pref.Live2dHOffset,
		"live2d_v_offset":    pref.Live2dVOffset,
		"live2d_width":       pref.Live2dWidth,
		"live2d_height":      pref.Live2dHeight,
		"live2d_scale":       pref.Live2dScale,
		"live2d_opacity":     pref.Live2dOpacity,
		"live2d_show_editor": pref.Live2dShowEditor,
		"live2d_mobile_show": pref.Live2dMobileShow,
		"live2d_enable_pointer_events_pass_through": pref.Live2dEnablePointerEventsPassThrough,
		"live2d_peek_visible_ratio":                 pref.Live2dPeekVisibleRatio,
		"live2d_nearby_retract_ratio":               pref.Live2dNearbyRetractRatio,
		"live2d_nearby_behavior":                    pref.Live2dNearbyBehavior,
		"live2d_proximity_threshold":                pref.Live2dProximityThreshold,
		"live2d_restore_delay":                      pref.Live2dRestoreDelay,
		"live2d_transition_duration":                pref.Live2dTransitionDuration,
		"local_storage_enabled":                     pref.LocalStorageEnabled,
		"local_storage_path":                        pref.LocalStoragePath,
		"export_json_with_settings":                 pref.ExportJsonWithSettings,
	})
}

// UpsertDailyStats increments the daily stats for the given user and field.
// Uses ON CONFLICT DO UPDATE for idempotent upsert.
func UpsertDailyStats(userID string, field string, increment int64) {
	today := time.Now().Format("2006-01-02")

	// Upsert: insert a new row or update the existing one for today
	switch field {
	case "resumes_created":
		database.DB.Exec(`
			INSERT INTO user_daily_stats (user_id, date, resumes_created, exports_count, editing_seconds)
			VALUES (?, ?, 1, 0, 0)
			ON CONFLICT (user_id, date) DO UPDATE SET resumes_created = user_daily_stats.resumes_created + 1
		`, userID, today)
	case "exports_count":
		database.DB.Exec(`
			INSERT INTO user_daily_stats (user_id, date, resumes_created, exports_count, editing_seconds)
			VALUES (?, ?, 0, 1, 0)
			ON CONFLICT (user_id, date) DO UPDATE SET exports_count = user_daily_stats.exports_count + 1
		`, userID, today)
	case "editing_seconds":
		database.DB.Exec(`
			INSERT INTO user_daily_stats (user_id, date, resumes_created, exports_count, editing_seconds)
			VALUES (?, ?, 0, 0, ?)
			ON CONFLICT (user_id, date) DO UPDATE SET editing_seconds = user_daily_stats.editing_seconds + ?
		`, userID, today, increment, increment)
	default:
		fmt.Printf("UpsertDailyStats: unknown field %s\n", field)
	}
}
