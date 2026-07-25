package handlers

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
	"time"
)

type AdminAIUsageResponse struct {
	Today      aiUsageTotals           `json:"today"`
	Month      aiUsageTotals           `json:"month"`
	Total      aiUsageTotals           `json:"total"`
	Providers  []aiUsageBreakdown      `json:"providers"`
	Models     []aiUsageModelBreakdown `json:"models"`
	DailyTrend []aiUsageDailyTrend     `json:"daily_trend"`
	TopUsers   []UserUsageItem         `json:"top_users"`
	MonthLabel string                  `json:"month_label"`
}

type UserUsageItem struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Tokens   int64  `json:"tokens"`
	Requests int64  `json:"requests"`
}

func GetGlobalAIUsage(c *gin.Context) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	monthStr := c.DefaultQuery("month", now.Format("2006-01"))
	monthStart, err := time.ParseInLocation("2006-01", monthStr, now.Location())
	if err != nil {
		monthStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	}
	monthEnd := monthStart.AddDate(0, 1, 0)

	today := sumGlobalAIUsage(&todayStart, nil)
	month := sumGlobalAIUsage(&monthStart, &monthEnd)
	total := sumGlobalAIUsage(nil, nil)

	providers := listGlobalProviderUsage(monthStart, monthEnd)
	models := listGlobalModelUsage(monthStart, monthEnd)
	dailyTrend := listGlobalDailyTrend(monthStart, monthEnd)
	topUsers := listTopUsers(10)

	c.JSON(http.StatusOK, AdminAIUsageResponse{
		Today: today, Month: month, Total: total,
		Providers: providers, Models: models,
		DailyTrend: dailyTrend, TopUsers: topUsers,
		MonthLabel: monthStr,
	})
}

func sumGlobalAIUsage(since, until *time.Time) aiUsageTotals {
	var totals aiUsageTotals
	query := database.DB.Model(&models.AIUsageLog{})
	if since != nil {
		query = query.Where("created_at >= ?", *since)
	}
	if until != nil {
		query = query.Where("created_at < ?", *until)
	}
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

func listGlobalProviderUsage(monthStart, monthEnd time.Time) []aiUsageBreakdown {
	providerLabels := map[string]string{
		"openai": "OpenAI", "deepseek": "DeepSeek", "gemini": "Gemini", "mimo": "MiMo", "other": "Other",
	}
	order := []string{"openai", "deepseek", "gemini", "mimo", "other"}

	var rows []aiUsageBreakdown
	database.DB.Model(&models.AIUsageLog{}).
		Where("created_at >= ? AND created_at < ?", monthStart, monthEnd).
		Select(`provider AS key, COUNT(*) AS request_count,
			COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
			COALESCE(SUM(total_tokens), 0) AS total_tokens,
			COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
			COALESCE(SUM(cache_hit_tokens), 0) AS cache_hit_tokens,
			COALESCE(SUM(cache_miss_tokens), 0) AS cache_miss_tokens`).
		Group("provider").Scan(&rows)

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

func listGlobalModelUsage(monthStart, monthEnd time.Time) []aiUsageModelBreakdown {
	var rows []aiUsageModelBreakdown
	database.DB.Model(&models.AIUsageLog{}).
		Where("created_at >= ? AND created_at < ?", monthStart, monthEnd).
		Select(`model, provider, COUNT(*) AS request_count,
			COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
			COALESCE(SUM(total_tokens), 0) AS total_tokens,
			COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
			COALESCE(SUM(cache_hit_tokens), 0) AS cache_hit_tokens,
			COALESCE(SUM(cache_miss_tokens), 0) AS cache_miss_tokens`).
		Group("model, provider").Order("total_tokens DESC").Limit(20).Scan(&rows)
	return rows
}

func listGlobalDailyTrend(monthStart, monthEnd time.Time) []aiUsageDailyTrend {
	var rows []aiUsageDailyTrend
	database.DB.Model(&models.AIUsageLog{}).
		Where("created_at >= ? AND created_at < ?", monthStart, monthEnd).
		Select(`TO_CHAR(created_at, 'YYYY-MM-DD') AS date, provider, model,
			COUNT(*) AS request_count,
			COALESCE(SUM(total_tokens), 0) AS total_tokens`).
		Group("date, provider, model").Order("date ASC, total_tokens DESC").Scan(&rows)
	return rows
}

func listTopUsers(limit int) []UserUsageItem {
	var rows []struct {
		UserID   string
		Tokens   int64
		Requests int64
	}
	database.DB.Model(&models.AIUsageLog{}).
		Select("user_id, COALESCE(SUM(total_tokens), 0) as tokens, COUNT(*) as requests").
		Group("user_id").Order("tokens DESC").Limit(limit).Scan(&rows)

	userIDs := make([]string, len(rows))
	for i, r := range rows {
		userIDs[i] = r.UserID
	}
	var users []models.User
	database.DB.Where("id IN ?", userIDs).Find(&users)
	userMap := map[string]models.User{}
	for _, u := range users {
		userMap[u.ID] = u
	}

	result := make([]UserUsageItem, 0, len(rows))
	for _, r := range rows {
		u, ok := userMap[r.UserID]
		username := r.UserID[:8]
		email := ""
		if ok {
			username = u.Username
			email = u.Email
		}
		result = append(result, UserUsageItem{
			UserID: r.UserID, Username: username, Email: email,
			Tokens: r.Tokens, Requests: r.Requests,
		})
	}
	return result
}

// GetUserAIUsageDetail gets AI usage for a specific user (admin view)
func GetUserAIUsageDetail(c *gin.Context) {
	userID := c.Param("id")
	now := time.Now()
	monthStr := c.DefaultQuery("month", now.Format("2006-01"))
	monthStart, err := time.ParseInLocation("2006-01", monthStr, now.Location())
	if err != nil {
		monthStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	}
	monthEnd := monthStart.AddDate(0, 1, 0)
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	filters := aiUsageQuery{MonthStart: monthStart, MonthEnd: monthEnd}

	today := sumAIUsage(userID, &todayStart, nil, filters)
	month := sumAIUsage(userID, &monthStart, &monthEnd, filters)
	total := sumAIUsage(userID, nil, nil, filters)
	recent, recentTotal := listRecentAIUsage(userID, 1, 50, filters)

	c.JSON(http.StatusOK, aiUsageResponse{
		Today: today, Month: month, Total: total,
		Providers: listProviderUsage(userID, filters),
		Models:    listModelUsage(userID, filters),
		Recent:    recent, RecentTotal: recentTotal,
		DailyTrend: listDailyTrend(userID, filters),
		MonthLabel: monthStr,
	})
}

// ============================================================
//  Audit Log
// ============================================================
