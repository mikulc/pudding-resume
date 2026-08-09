package handlers

import (
	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
	"strings"
)

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
	AiServiceModel     string `json:"ai_service_model"`
	AiServicePrompt    string `json:"ai_service_prompt"`
	// Live2D preferences
	Live2dEnabled                        bool   `json:"live2d_enabled"`
	Live2dPosition                       string `json:"live2d_position"`
	Live2dShowEditor                     bool   `json:"live2d_show_editor"`
	Live2dMobileShow                     bool   `json:"live2d_mobile_show"`
	Live2dEnablePointerEventsPassThrough bool   `json:"live2d_enable_pointer_events_pass_through"`
	Live2dNearbyBehavior                 string `json:"live2d_nearby_behavior"`
	Live2dPinned                         bool   `json:"live2d_pinned"`
	LocalStorageEnabled                  bool   `json:"local_storage_enabled"`
	LocalStoragePath                     string `json:"local_storage_path"`
	ExportJsonWithSettings               bool   `json:"export_json_with_settings"`
	QuotaUpdatedAt                       string `json:"quota_updated_at"`
	CreatedAt                            string `json:"created_at"`
	LastLoginAt                          string `json:"last_login_at"`
	EmailVerifiedAt                      string `json:"email_verified_at"`
}

type UpdatePreferencesRequest struct {
	AutoSaveInterval *int    `json:"auto_save_interval"`
	AiPolishEnabled  *bool   `json:"ai_polish_enabled"`
	ThemeMode        *string `json:"theme_mode"`
	Language         *string `json:"language"`
	AiServiceApiUrl  *string `json:"ai_service_api_url"`
	AiServiceModel   *string `json:"ai_service_model"`
	AiServicePrompt  *string `json:"ai_service_prompt"`
	// Live2D preferences (pointer for partial update)
	Live2dEnabled                        *bool   `json:"live2d_enabled"`
	Live2dPosition                       *string `json:"live2d_position"`
	Live2dShowEditor                     *bool   `json:"live2d_show_editor"`
	Live2dMobileShow                     *bool   `json:"live2d_mobile_show"`
	Live2dEnablePointerEventsPassThrough *bool   `json:"live2d_enable_pointer_events_pass_through"`
	Live2dNearbyBehavior                 *string `json:"live2d_nearby_behavior"`
	Live2dPinned                         *bool   `json:"live2d_pinned"`
	// 鏈湴瀛樺偍鍋忓ソ
	LocalStorageEnabled *bool   `json:"local_storage_enabled"`
	LocalStoragePath    *string `json:"local_storage_path"`
	// 瀵煎嚭鍋忓ソ
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
		ID:                                   string(user.ID),
		Username:                             user.Username,
		Email:                                user.Email,
		Avatar:                               buildAvatarURL(user.Avatar),
		Role:                                 user.Role,
		MaxResumes:                           quota.MaxResumes,
		UsedResumes:                          usedResumes,
		ExportCount:                          quota.ExportCount,
		DailyLimitTokens:                     quota.DailyLimitTokens,
		MonthlyLimitTokens:                   quota.MonthlyLimitTokens,
		AutoSaveInterval:                     pref.AutoSaveInterval,
		AiPolishEnabled:                      pref.AiPolishEnabled,
		ThemeMode:                            normalizeThemeMode(pref.ThemeMode),
		Language:                             normalizeLanguage(pref.Language),
		AiServiceApiUrl:                      aifc.ApiUrl,
		AiServiceModel:                       aifc.Model,
		AiServicePrompt:                      aifc.Prompt,
		Live2dEnabled:                        pref.Live2dEnabled,
		Live2dPosition:                       pref.Live2dPosition,
		Live2dShowEditor:                     pref.Live2dShowEditor,
		Live2dMobileShow:                     pref.Live2dMobileShow,
		Live2dEnablePointerEventsPassThrough: pref.Live2dEnablePointerEventsPassThrough,
		Live2dNearbyBehavior:                 pref.Live2dNearbyBehavior,
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
		EmailVerifiedAt: func() string {
			if user.EmailVerifiedAt != nil {
				return user.EmailVerifiedAt.Format("2006-01-02 15:04")
			}
			return ""
		}(),
	}
}

// --- Handlers ---

// GetProfile handles GET /api/user/profile (requires auth)
