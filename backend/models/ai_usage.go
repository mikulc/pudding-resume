package models

import "time"

// AIUsageLog stores per-call AI token usage for authenticated users.
type AIUsageLog struct {
	ID               string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID           string    `json:"user_id" gorm:"type:uuid;not null;index"`
	Feature          string    `json:"feature" gorm:"size:32;not null;index"`
	ModelSource      string    `json:"model_source" gorm:"size:16;not null;index"`
	Provider         string    `json:"provider" gorm:"size:32;not null;index"`
	PublicModelID    *string   `json:"public_model_id" gorm:"type:uuid;index"`
	Model            string    `json:"model" gorm:"size:128;not null;index"`
	PromptTokens     int       `json:"prompt_tokens" gorm:"default:0;not null"`
	CompletionTokens int       `json:"completion_tokens" gorm:"default:0;not null"`
	TotalTokens      int       `json:"total_tokens" gorm:"default:0;not null"`
	ReasoningTokens  int       `json:"reasoning_tokens" gorm:"default:0;not null"`
	CacheHitTokens   int       `json:"cache_hit_tokens" gorm:"default:0;not null"`
	CacheMissTokens  int       `json:"cache_miss_tokens" gorm:"default:0;not null"`
	UsageStatus      string    `json:"usage_status" gorm:"size:16;default:unknown;not null;index"`
	Success          bool      `json:"success" gorm:"default:false;not null;index"`
	ErrorMessage     string    `json:"error_message" gorm:"size:512;default:''"`
	LatencyMs        int64     `json:"latency_ms" gorm:"default:0;not null"`
	CreatedAt        time.Time `json:"created_at" gorm:"index"`
}

func (AIUsageLog) TableName() string {
	return "ai_usage_logs"
}
