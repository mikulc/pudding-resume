package handlers

import (
	"time"
)

type AIUsage struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
	ReasoningTokens  int
	CacheHitTokens   int
	CacheMissTokens  int
	Status           string
}

type aiAPIResult struct {
	Content []byte
	Usage   AIUsage
}

type aiUsageTotals struct {
	RequestCount     int64 `json:"request_count"`
	PromptTokens     int   `json:"prompt_tokens"`
	CompletionTokens int   `json:"completion_tokens"`
	TotalTokens      int   `json:"total_tokens"`
	ReasoningTokens  int   `json:"reasoning_tokens"`
	CacheHitTokens   int   `json:"cache_hit_tokens"`
	CacheMissTokens  int   `json:"cache_miss_tokens"`
}

type aiUsageBreakdown struct {
	Key              string `json:"key" gorm:"column:provider_key"`
	Label            string `json:"label"`
	RequestCount     int64  `json:"request_count"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	TotalTokens      int    `json:"total_tokens"`
	ReasoningTokens  int    `json:"reasoning_tokens"`
	CacheHitTokens   int    `json:"cache_hit_tokens"`
	CacheMissTokens  int    `json:"cache_miss_tokens"`
}

type aiUsageModelBreakdown struct {
	Model            string `json:"model"`
	Provider         string `json:"provider"`
	RequestCount     int64  `json:"request_count"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	TotalTokens      int    `json:"total_tokens"`
	ReasoningTokens  int    `json:"reasoning_tokens"`
	CacheHitTokens   int    `json:"cache_hit_tokens"`
	CacheMissTokens  int    `json:"cache_miss_tokens"`
}

type aiUsageRecord struct {
	ID               string `json:"id"`
	Feature          string `json:"feature"`
	Provider         string `json:"provider"`
	Model            string `json:"model"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	TotalTokens      int    `json:"total_tokens"`
	ReasoningTokens  int    `json:"reasoning_tokens"`
	CacheHitTokens   int    `json:"cache_hit_tokens"`
	CacheMissTokens  int    `json:"cache_miss_tokens"`
	UsageStatus      string `json:"usage_status"`
	Success          bool   `json:"success"`
	LatencyMs        int64  `json:"latency_ms"`
	CreatedAt        string `json:"created_at"`
}

type aiUsageLimits struct {
	DailyLimitTokens       int  `json:"daily_limit_tokens"`
	MonthlyLimitTokens     int  `json:"monthly_limit_tokens"`
	DailyRemainingTokens   *int `json:"daily_remaining_tokens"`
	MonthlyRemainingTokens *int `json:"monthly_remaining_tokens"`
}

type aiUsageDailyTrend struct {
	Date             string `json:"date" gorm:"column:usage_date"`
	Provider         string `json:"provider"`
	Model            string `json:"model"`
	RequestCount     int64  `json:"request_count"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	TotalTokens      int    `json:"total_tokens"`
	ReasoningTokens  int    `json:"reasoning_tokens"`
	CacheHitTokens   int    `json:"cache_hit_tokens"`
	CacheMissTokens  int    `json:"cache_miss_tokens"`
}

type aiUsageQuery struct {
	Month          string
	Provider       string
	Model          string
	MonthStart     time.Time
	MonthEnd       time.Time
	RecentPage     int
	RecentPageSize int
}

type aiUsageResponse struct {
	Today       aiUsageTotals           `json:"today"`
	Month       aiUsageTotals           `json:"month"`
	Total       aiUsageTotals           `json:"total"`
	Limits      aiUsageLimits           `json:"limits"`
	Providers   []aiUsageBreakdown      `json:"providers"`
	Models      []aiUsageModelBreakdown `json:"models"`
	Recent      []aiUsageRecord         `json:"recent"`
	RecentTotal int64                   `json:"recent_total"`
	DailyTrend  []aiUsageDailyTrend     `json:"daily_trend"`
	MonthLabel  string                  `json:"month_label"`
}
