package handlers

import (
	"errors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"strings"
)

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
		"ai_service_model":   aifc.Model,
		"ai_service_prompt":  aifc.Prompt,
		"live2d_enabled":     pref.Live2dEnabled,
		"live2d_position":    pref.Live2dPosition,
		"live2d_show_editor": pref.Live2dShowEditor,
		"live2d_mobile_show": pref.Live2dMobileShow,
		"live2d_enable_pointer_events_pass_through": pref.Live2dEnablePointerEventsPassThrough,
		"live2d_nearby_behavior":                    pref.Live2dNearbyBehavior,
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

	if req.AiServiceModel != nil {
		aiUpdates["model"] = *req.AiServiceModel
	}

	if req.AiServicePrompt != nil {
		aiUpdates["prompt"] = *req.AiServicePrompt
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
	if req.Live2dShowEditor != nil {
		updates["live2d_show_editor"] = *req.Live2dShowEditor
	}

	if req.Live2dMobileShow != nil {
		updates["live2d_mobile_show"] = *req.Live2dMobileShow
	}

	if req.Live2dEnablePointerEventsPassThrough != nil {
		updates["live2d_enable_pointer_events_pass_through"] = *req.Live2dEnablePointerEventsPassThrough
	}
	if req.Live2dNearbyBehavior != nil {
		behavior := *req.Live2dNearbyBehavior
		if behavior != "expand" && behavior != "retract" {
			respondError(c, http.StatusBadRequest, "看板娘靠近行为仅支持 expand 或 retract")
			return
		}
		updates["live2d_nearby_behavior"] = behavior
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
				aifc = models.AIServiceConfig{UserID: models.UUID(userID)}
				for k, v := range aiUpdates {
					switch k {
					case "api_url":
						aifc.ApiUrl = v.(string)
					case "model":
						aifc.Model = v.(string)
					case "prompt":
						aifc.Prompt = v.(string)
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
		"ai_service_model":   aifc.Model,
		"ai_service_prompt":  aifc.Prompt,
		"live2d_enabled":     pref.Live2dEnabled,
		"live2d_position":    pref.Live2dPosition,
		"live2d_show_editor": pref.Live2dShowEditor,
		"live2d_mobile_show": pref.Live2dMobileShow,
		"live2d_enable_pointer_events_pass_through": pref.Live2dEnablePointerEventsPassThrough,
		"live2d_nearby_behavior":                    pref.Live2dNearbyBehavior,
		"local_storage_enabled":                     pref.LocalStorageEnabled,
		"local_storage_path":                        pref.LocalStoragePath,
		"export_json_with_settings":                 pref.ExportJsonWithSettings,
	})
}

// UpsertDailyStats increments the daily stats for the given user and field.
// GORM translates the upsert clause for PostgreSQL and MySQL.
