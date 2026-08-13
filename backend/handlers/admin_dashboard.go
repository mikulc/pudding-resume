package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
	"time"
)

type DashboardResponse struct {
	TotalUsers      int64            `json:"total_users"`
	TodayNewUsers   int64            `json:"today_new_users"`
	TotalResumes    int64            `json:"total_resumes"`
	TodayAIRequests int64            `json:"today_ai_requests"`
	TodayTokens     int64            `json:"today_tokens"`
	MonthTokens     int64            `json:"month_tokens"`
	TotalTokens     int64            `json:"total_tokens"`
	ActiveUsers30d  int64            `json:"active_users_30d"`
	ModelUsage      []ModelUsageItem `json:"model_usage"`
	DailyNewUsers   []DailyCountItem `json:"daily_new_users"`
	DailyTokens     []DailyTokenItem `json:"daily_tokens"`
}

type ModelUsageItem struct {
	Name   string `json:"name"`
	Count  int64  `json:"count"`
	Tokens int64  `json:"tokens"`
}

type DailyCountItem struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type DailyTokenItem struct {
	Date   string `json:"date"`
	Tokens int64  `json:"tokens"`
}

func newDashboardResponse() DashboardResponse {
	return DashboardResponse{
		ModelUsage:    make([]ModelUsageItem, 0),
		DailyNewUsers: make([]DailyCountItem, 0),
		DailyTokens:   make([]DailyTokenItem, 0),
	}
}

func GetDashboard(c *gin.Context) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	days30Ago := now.AddDate(0, 0, -30)

	resp := newDashboardResponse()

	// Total users
	database.DB.Model(&models.User{}).Count(&resp.TotalUsers)
	// Today new users
	database.DB.Model(&models.User{}).Where("created_at >= ?", todayStart).Count(&resp.TodayNewUsers)
	// Total resumes
	database.DB.Model(&models.Resume{}).Count(&resp.TotalResumes)
	// Today AI requests
	database.DB.Model(&models.AIUsageLog{}).Where("created_at >= ?", todayStart).Count(&resp.TodayAIRequests)
	// Today tokens
	database.DB.Model(&models.AIUsageLog{}).Where("created_at >= ?", todayStart).
		Select("COALESCE(SUM(total_tokens), 0)").Row().Scan(&resp.TodayTokens)
	// Month tokens
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	database.DB.Model(&models.AIUsageLog{}).Where("created_at >= ? AND created_at < ?", monthStart, now).
		Select("COALESCE(SUM(total_tokens), 0)").Row().Scan(&resp.MonthTokens)
	// Total tokens
	database.DB.Model(&models.AIUsageLog{}).
		Select("COALESCE(SUM(total_tokens), 0)").Row().Scan(&resp.TotalTokens)
	// Active users 30d (users who made AI requests)
	database.DB.Model(&models.AIUsageLog{}).Where("created_at >= ?", days30Ago).
		Distinct("user_id").Count(&resp.ActiveUsers30d)

	// Model usage ranking (top 10)
	var modelRows []struct {
		Model  string
		Count  int64
		Tokens int64
	}
	database.DB.Model(&models.AIUsageLog{}).
		Select("model, COUNT(*) as count, COALESCE(SUM(total_tokens), 0) as tokens").
		Group("model").Order("count DESC").Limit(10).Scan(&modelRows)
	for _, r := range modelRows {
		resp.ModelUsage = append(resp.ModelUsage, ModelUsageItem{Name: r.Model, Count: r.Count, Tokens: r.Tokens})
	}

	// Daily new users (30 days)
	var dailyUsers []struct {
		Date  string `gorm:"column:usage_date"`
		Count int64
	}
	database.DB.Model(&models.User{}).Where("created_at >= ?", days30Ago).
		Select(fmt.Sprintf("%s AS usage_date, COUNT(*) AS count", dateOnlyExpression(database.DB.Dialector.Name(), "created_at"))).
		Group("usage_date").Order("usage_date ASC").Scan(&dailyUsers)
	for _, d := range dailyUsers {
		resp.DailyNewUsers = append(resp.DailyNewUsers, DailyCountItem{Date: d.Date, Count: d.Count})
	}

	// Daily tokens (30 days)
	var dailyTokens []struct {
		Date   string `gorm:"column:usage_date"`
		Tokens int64
	}
	database.DB.Model(&models.AIUsageLog{}).Where("created_at >= ?", days30Ago).
		Select(fmt.Sprintf("%s AS usage_date, COALESCE(SUM(total_tokens), 0) AS tokens", dateOnlyExpression(database.DB.Dialector.Name(), "created_at"))).
		Group("usage_date").Order("usage_date ASC").Scan(&dailyTokens)
	for _, d := range dailyTokens {
		resp.DailyTokens = append(resp.DailyTokens, DailyTokenItem{Date: d.Date, Tokens: d.Tokens})
	}

	c.JSON(http.StatusOK, resp)
}
