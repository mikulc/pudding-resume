package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"strconv"
	"strings"
	"time"
)

func GetAIUsage(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		respondError(c, http.StatusUnauthorized, "未登录，请先登录")
		return
	}

	now := time.Now()
	query, err := parseAIUsageQuery(c, now)
	if err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	today := sumAIUsage(userID, &todayStart, nil, query)
	month := sumAIUsage(userID, &query.MonthStart, &query.MonthEnd, query)
	total := sumAIUsage(userID, nil, nil, query)
	recent, recentTotal := listRecentAIUsage(userID, query.RecentPage, query.RecentPageSize, query)

	response := aiUsageResponse{
		Today:       today,
		Month:       month,
		Total:       total,
		Limits:      getAIUsageLimits(userID, today.TotalTokens, month.TotalTokens),
		Providers:   listProviderUsage(userID, query),
		Models:      listModelUsage(userID, query),
		Recent:      recent,
		RecentTotal: recentTotal,
		DailyTrend:  listDailyTrend(userID, query),
		MonthLabel:  query.Month,
	}

	c.JSON(http.StatusOK, response)
}

func parseAIUsageQuery(c *gin.Context, now time.Time) (aiUsageQuery, error) {
	month := strings.TrimSpace(c.Query("month"))
	if month == "" {
		month = now.Format("2006-01")
	}

	monthStart, err := time.ParseInLocation("2006-01", month, now.Location())
	if err != nil {
		return aiUsageQuery{}, fmt.Errorf("月份格式无效，请使用 YYYY-MM")
	}

	recentPage := queryInt(c, "recent_page", 1, 1, 1000000)
	recentPageSize := queryInt(c, "recent_page_size", 10, 1, 100)

	return aiUsageQuery{
		Month:          month,
		Provider:       strings.TrimSpace(c.Query("provider")),
		Model:          strings.TrimSpace(c.Query("model")),
		MonthStart:     monthStart,
		MonthEnd:       monthStart.AddDate(0, 1, 0),
		RecentPage:     recentPage,
		RecentPageSize: recentPageSize,
	}, nil
}

func queryInt(c *gin.Context, key string, fallback, minValue, maxValue int) int {
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	if parsed < minValue {
		return minValue
	}
	if parsed > maxValue {
		return maxValue
	}
	return parsed
}

func applyAIUsageFilters(query *gorm.DB, filters aiUsageQuery) *gorm.DB {
	if filters.Provider != "" && filters.Provider != "all" {
		query = query.Where("provider = ?", filters.Provider)
	}
	if filters.Model != "" && filters.Model != "all" {
		query = query.Where("model = ?", filters.Model)
	}
	return query
}

func sumAIUsage(userID string, since *time.Time, until *time.Time, filters aiUsageQuery) aiUsageTotals {
	var totals aiUsageTotals
	query := database.DB.Model(&models.AIUsageLog{}).Where("user_id = ?", userID)
	if since != nil {
		query = query.Where("created_at >= ?", *since)
	}
	if until != nil {
		query = query.Where("created_at < ?", *until)
	}
	query = applyAIUsageFilters(query, filters)
	query.Select(`
		COUNT(*) AS request_count,
		COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
		COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
		COALESCE(SUM(total_tokens), 0) AS total_tokens,
		COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
		COALESCE(SUM(cache_hit_tokens), 0) AS cache_hit_tokens,
		COALESCE(SUM(cache_miss_tokens), 0) AS cache_miss_tokens
	`).Scan(&totals)
	return totals
}

func getAIUsageLimits(userID string, todayTokens, monthTokens int) aiUsageLimits {
	var quota models.UserQuota
	limits := aiUsageLimits{}
	if err := database.DB.Where("user_id = ?", userID).First(&quota).Error; err != nil {
		return limits
	}

	limits.DailyLimitTokens = quota.DailyLimitTokens
	limits.MonthlyLimitTokens = quota.MonthlyLimitTokens
	if quota.DailyLimitTokens > 0 {
		remaining := quota.DailyLimitTokens - todayTokens
		if remaining < 0 {
			remaining = 0
		}
		limits.DailyRemainingTokens = &remaining
	}
	if quota.MonthlyLimitTokens > 0 {
		remaining := quota.MonthlyLimitTokens - monthTokens
		if remaining < 0 {
			remaining = 0
		}
		limits.MonthlyRemainingTokens = &remaining
	}
	return limits
}

func listProviderUsage(userID string, filters aiUsageQuery) []aiUsageBreakdown {
	providerLabels := map[string]string{
		"openai":   "OpenAI",
		"deepseek": "DeepSeek",
		"gemini":   "Gemini",
		"mimo":     "MiMo",
		"other":    "Other",
	}
	order := []string{"openai", "deepseek", "gemini", "mimo", "other"}

	var rows []aiUsageBreakdown
	query := database.DB.Model(&models.AIUsageLog{}).
		Where("user_id = ? AND created_at >= ? AND created_at < ?", userID, filters.MonthStart, filters.MonthEnd)
	query = applyAIUsageFilters(query, aiUsageQuery{Model: filters.Model})
	query.
		Select(`
			provider AS key,
			COUNT(*) AS request_count,
			COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
			COALESCE(SUM(total_tokens), 0) AS total_tokens,
			COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
			COALESCE(SUM(cache_hit_tokens), 0) AS cache_hit_tokens,
			COALESCE(SUM(cache_miss_tokens), 0) AS cache_miss_tokens
		`).
		Group("provider").
		Scan(&rows)

	byProvider := map[string]aiUsageBreakdown{}
	for _, row := range rows {
		if row.Key == "" {
			row.Key = "other"
		}
		row.Label = providerLabels[row.Key]
		if row.Label == "" {
			row.Label = row.Key
		}
		byProvider[row.Key] = row
	}

	result := make([]aiUsageBreakdown, 0, len(order))
	for _, key := range order {
		row := byProvider[key]
		row.Key = key
		row.Label = providerLabels[key]
		result = append(result, row)
	}
	return result
}

func listModelUsage(userID string, filters aiUsageQuery) []aiUsageModelBreakdown {
	var rows []aiUsageModelBreakdown
	query := database.DB.Model(&models.AIUsageLog{}).
		Where("user_id = ? AND created_at >= ? AND created_at < ?", userID, filters.MonthStart, filters.MonthEnd)
	query = applyAIUsageFilters(query, filters)
	query.
		Select(`
			model,
			provider,
			COUNT(*) AS request_count,
			COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
			COALESCE(SUM(total_tokens), 0) AS total_tokens,
			COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
			COALESCE(SUM(cache_hit_tokens), 0) AS cache_hit_tokens,
			COALESCE(SUM(cache_miss_tokens), 0) AS cache_miss_tokens
		`).
		Group("model, provider").
		Order("total_tokens DESC").
		Limit(50).
		Scan(&rows)
	return rows
}

func listRecentAIUsage(userID string, page int, pageSize int, filters aiUsageQuery) ([]aiUsageRecord, int64) {
	var logs []models.AIUsageLog
	baseQuery := database.DB.Model(&models.AIUsageLog{}).
		Where("user_id = ? AND created_at >= ? AND created_at < ?", userID, filters.MonthStart, filters.MonthEnd)
	baseQuery = applyAIUsageFilters(baseQuery, filters)

	var total int64
	baseQuery.Session(&gorm.Session{}).Count(&total)

	baseQuery.
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&logs)

	records := make([]aiUsageRecord, 0, len(logs))
	for _, item := range logs {
		records = append(records, aiUsageRecord{
			ID:               string(item.ID),
			Feature:          item.Feature,
			Provider:         item.Provider,
			Model:            item.Model,
			PromptTokens:     item.PromptTokens,
			CompletionTokens: item.CompletionTokens,
			TotalTokens:      item.TotalTokens,
			ReasoningTokens:  item.ReasoningTokens,
			CacheHitTokens:   item.CacheHitTokens,
			CacheMissTokens:  item.CacheMissTokens,
			UsageStatus:      item.UsageStatus,
			Success:          item.Success,
			LatencyMs:        item.LatencyMs,
			CreatedAt:        item.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}
	return records, total
}

func listDailyTrend(userID string, filters aiUsageQuery) []aiUsageDailyTrend {
	var rows []aiUsageDailyTrend
	query := database.DB.Model(&models.AIUsageLog{}).
		Where("user_id = ? AND created_at >= ? AND created_at < ?", userID, filters.MonthStart, filters.MonthEnd)
	query = applyAIUsageFilters(query, filters)
	query.
		Select(`
			TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
			provider,
			model,
			COUNT(*) AS request_count,
			COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
			COALESCE(SUM(total_tokens), 0) AS total_tokens,
			COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
			COALESCE(SUM(cache_hit_tokens), 0) AS cache_hit_tokens,
			COALESCE(SUM(cache_miss_tokens), 0) AS cache_miss_tokens
		`).
		Group("date, provider, model").
		Order("date ASC, total_tokens DESC").
		Scan(&rows)
	return rows
}
