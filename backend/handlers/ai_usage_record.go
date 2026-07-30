package handlers

import (
	"github.com/gin-gonic/gin"
	"log"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
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
		Provider:         cfg.Provider,
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
