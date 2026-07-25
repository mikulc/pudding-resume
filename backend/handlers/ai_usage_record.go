package handlers

import (
	"github.com/gin-gonic/gin"
	"log"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"strings"
	"time"
)

func recordAIUsage(c *gin.Context, feature string, cfg resolvedAIConfig, usage AIUsage, success bool, callErr error, latency time.Duration) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return
	}

	status := usage.Status
	if status == "" {
		status = "unknown"
	}
	if status == "unknown" {
		log.Printf("[ai_usage] usage unavailable user=%s feature=%s provider=%s model=%s", userID, feature, cfg.Provider, cfg.Model)
	}

	var publicModelID *string
	if strings.TrimSpace(cfg.PublicModelID) != "" {
		id := strings.TrimSpace(cfg.PublicModelID)
		publicModelID = &id
	}

	errorMessage := ""
	if callErr != nil {
		errorMessage = callErr.Error()
		if len(errorMessage) > 512 {
			errorMessage = errorMessage[:512]
		}
	}

	logEntry := models.AIUsageLog{
		UserID:           userID,
		Feature:          feature,
		ModelSource:      cfg.ModelSource,
		Provider:         cfg.Provider,
		PublicModelID:    publicModelID,
		Model:            cfg.Model,
		PromptTokens:     usage.PromptTokens,
		CompletionTokens: usage.CompletionTokens,
		TotalTokens:      usage.TotalTokens,
		ReasoningTokens:  usage.ReasoningTokens,
		CacheHitTokens:   usage.CacheHitTokens,
		CacheMissTokens:  usage.CacheMissTokens,
		UsageStatus:      status,
		Success:          success,
		ErrorMessage:     errorMessage,
		LatencyMs:        latency.Milliseconds(),
	}

	if err := database.DB.Create(&logEntry).Error; err != nil {
		log.Printf("[ai_usage] failed to record usage user=%s feature=%s provider=%s model=%s: %v", userID, feature, cfg.Provider, cfg.Model, err)
	}
}
