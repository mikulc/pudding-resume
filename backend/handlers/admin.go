package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"pudding-resume-backend/utils"
)

// ============================================================
//  Dashboard
// ============================================================

type DashboardResponse struct {
	TotalUsers       int64               `json:"total_users"`
	TodayNewUsers    int64               `json:"today_new_users"`
	TotalResumes     int64               `json:"total_resumes"`
	TodayAIRequests  int64               `json:"today_ai_requests"`
	TodayTokens      int64               `json:"today_tokens"`
	MonthTokens      int64               `json:"month_tokens"`
	TotalTokens      int64               `json:"total_tokens"`
	ActiveUsers30d   int64               `json:"active_users_30d"`
	ModelUsage       []ModelUsageItem    `json:"model_usage"`
	DailyNewUsers    []DailyCountItem    `json:"daily_new_users"`
	DailyTokens      []DailyTokenItem    `json:"daily_tokens"`
}

type ModelUsageItem struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
	Tokens int64 `json:"tokens"`
}

type DailyCountItem struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type DailyTokenItem struct {
	Date   string `json:"date"`
	Tokens int64  `json:"tokens"`
}

func GetDashboard(c *gin.Context) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	days30Ago := now.AddDate(0, 0, -30)

	resp := DashboardResponse{}

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
		Date  string
		Count int64
	}
	database.DB.Model(&models.User{}).Where("created_at >= ?", days30Ago).
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count").
		Group("date").Order("date ASC").Scan(&dailyUsers)
	for _, d := range dailyUsers {
		resp.DailyNewUsers = append(resp.DailyNewUsers, DailyCountItem{Date: d.Date, Count: d.Count})
	}

	// Daily tokens (30 days)
	var dailyTokens []struct {
		Date   string
		Tokens int64
	}
	database.DB.Model(&models.AIUsageLog{}).Where("created_at >= ?", days30Ago).
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(total_tokens), 0) as tokens").
		Group("date").Order("date ASC").Scan(&dailyTokens)
	for _, d := range dailyTokens {
		resp.DailyTokens = append(resp.DailyTokens, DailyTokenItem{Date: d.Date, Tokens: d.Tokens})
	}

	c.JSON(http.StatusOK, resp)
}

// ============================================================
//  User Management
// ============================================================

type AdminUserItem struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	Avatar       string `json:"avatar"`
	Role         string `json:"role"`
	Status       string `json:"status"`
	CreatedAt    string `json:"created_at"`
	LastLoginAt  string `json:"last_login_at"`
	ResumeCount  int64  `json:"resume_count"`
	MaxResumes   int    `json:"max_resumes"`
	ExportCount  int    `json:"export_count"`
	DailyLimit   int    `json:"daily_limit_tokens"`
	MonthlyLimit int    `json:"monthly_limit_tokens"`
	DeletedAt    string `json:"deleted_at"`
}

type AdminUserListResponse struct {
	Users []AdminUserItem `json:"users"`
	Total int64           `json:"total"`
	Page  int             `json:"page"`
	Size  int             `json:"size"`
}

type AdminUserDetailResponse struct {
	AdminUserItem
	TotalResumesCreated int64  `json:"total_resumes_created"`
	TotalExports        int64  `json:"total_exports"`
	TotalEditingSeconds int64  `json:"total_editing_seconds"`
	LastActiveAt        string `json:"last_active_at"`
}

type UpdateUserQuotaRequest struct {
	MaxResumes         *int `json:"max_resumes"`
	ExportCount        *int `json:"export_count"`
	DailyLimitTokens   *int `json:"daily_limit_tokens"`
	MonthlyLimitTokens *int `json:"monthly_limit_tokens"`
}

type UpdateUserRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

type ResetPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required"`
}

func ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	search := strings.TrimSpace(c.Query("search"))
	roleFilter := strings.TrimSpace(c.Query("role"))
	includeDeleted := c.Query("deleted") == "true"

	if page < 1 { page = 1 }
	if size < 1 || size > 100 { size = 20 }

	baseQuery := database.DB.Model(&models.User{})

	// Include soft-deleted if requested
	if !includeDeleted {
		baseQuery = baseQuery.Where("deleted_at IS NULL")
	}
	if search != "" {
		like := "%" + search + "%"
		baseQuery = baseQuery.Where("username ILIKE ? OR email ILIKE ?", like, like)
	}
	if roleFilter != "" && roleFilter != "all" {
		baseQuery = baseQuery.Where("role = ?", roleFilter)
	}

	var total int64
	baseQuery.Session(&gorm.Session{}).Count(&total)

	var dbUsers []models.User
	baseQuery.Order("created_at DESC").Offset((page - 1) * size).Limit(size).Find(&dbUsers)

	userIDs := make([]string, len(dbUsers))
	for i, u := range dbUsers { userIDs[i] = u.ID }

	// Fetch quotas in batch
	var quotas []models.UserQuota
	database.DB.Where("user_id IN ?", userIDs).Find(&quotas)
	quotaMap := map[string]models.UserQuota{}
	for _, q := range quotas { quotaMap[q.UserID] = q }

	// Fetch resume counts in batch
	type countRow struct { UserID string; Count int64 }
	var counts []countRow
	database.DB.Model(&models.Resume{}).Where("user_id IN ?", userIDs).
		Select("user_id, COUNT(*) as count").Group("user_id").Scan(&counts)
	countMap := map[string]int64{}
	for _, c := range counts { countMap[c.UserID] = c.Count }

	users := make([]AdminUserItem, 0, len(dbUsers))
	for _, u := range dbUsers {
		q := quotaMap[u.ID]
		status := "active"
		if u.DeletedAt.Valid {
			status = "deleted"
		}
		lastLogin := ""
		if u.LastLoginAt != nil {
			lastLogin = u.LastLoginAt.Format("2006-01-02 15:04")
		}
		deletedAt := ""
		if u.DeletedAt.Valid {
			deletedAt = u.DeletedAt.Time.Format("2006-01-02 15:04")
		}
		users = append(users, AdminUserItem{
			ID: u.ID, Username: u.Username, Email: u.Email,
			Avatar: buildAvatarURL(u.Avatar), Role: u.Role, Status: status,
			CreatedAt: u.CreatedAt.Format("2006-01-02 15:04"),
			LastLoginAt: lastLogin, ResumeCount: countMap[u.ID],
			MaxResumes: q.MaxResumes, ExportCount: q.ExportCount,
			DailyLimit: q.DailyLimitTokens, MonthlyLimit: q.MonthlyLimitTokens,
			DeletedAt: deletedAt,
		})
	}

	c.JSON(http.StatusOK, AdminUserListResponse{
		Users: users, Total: total, Page: page, Size: size,
	})
}

func GetUserDetail(c *gin.Context) {
	userID := c.Param("id")

	var u models.User
	if err := database.DB.Unscoped().Where("id = ?", userID).First(&u).Error; err != nil {
		respondError(c, http.StatusNotFound, "用户不存在")
		return
	}

	var q models.UserQuota
	database.DB.Where("user_id = ?", userID).First(&q)

	var s models.UserStats
	database.DB.Where("user_id = ?", userID).First(&s)

	var resumeCount int64
	database.DB.Model(&models.Resume{}).Where("user_id = ?", userID).Count(&resumeCount)

	status := "active"
	if u.DeletedAt.Valid { status = "deleted" }
	lastLogin := ""
	if u.LastLoginAt != nil { lastLogin = u.LastLoginAt.Format("2006-01-02 15:04") }
	lastActive := ""
	if !s.LastActiveAt.IsZero() { lastActive = s.LastActiveAt.Format("2006-01-02 15:04") }

	c.JSON(http.StatusOK, AdminUserDetailResponse{
		AdminUserItem: AdminUserItem{
			ID: u.ID, Username: u.Username, Email: u.Email,
			Avatar: buildAvatarURL(u.Avatar), Role: u.Role, Status: status,
			CreatedAt: u.CreatedAt.Format("2006-01-02 15:04"),
			LastLoginAt: lastLogin, ResumeCount: resumeCount,
			MaxResumes: q.MaxResumes, ExportCount: q.ExportCount,
			DailyLimit: q.DailyLimitTokens, MonthlyLimit: q.MonthlyLimitTokens,
		},
		TotalResumesCreated: int64(s.TotalResumesCreated),
		TotalExports:        int64(s.TotalExports),
		TotalEditingSeconds: s.TotalEditingSeconds,
		LastActiveAt:        lastActive,
	})
}

func UpdateUserQuota(c *gin.Context) {
	userID := c.Param("id")
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	var req UpdateUserQuotaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	if req.MaxResumes != nil && *req.MaxResumes < 0 {
		respondError(c, http.StatusBadRequest, "最大简历数不能为负数")
		return
	}
	if req.ExportCount != nil && *req.ExportCount < 0 {
		respondError(c, http.StatusBadRequest, "导出次数不能为负数")
		return
	}

	var existing models.UserQuota
	result := database.DB.Where("user_id = ?", userID).First(&existing)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Create quota record
			q := models.UserQuota{UserID: userID}
			if req.MaxResumes != nil { q.MaxResumes = *req.MaxResumes }
			if req.ExportCount != nil { q.ExportCount = *req.ExportCount }
			if req.DailyLimitTokens != nil { q.DailyLimitTokens = *req.DailyLimitTokens }
			if req.MonthlyLimitTokens != nil { q.MonthlyLimitTokens = *req.MonthlyLimitTokens }
			if err := database.DB.Create(&q).Error; err != nil {
				respondError(c, http.StatusInternalServerError, "创建配额失败")
				return
			}
		} else {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}
	} else {
		updates := map[string]any{}
		if req.MaxResumes != nil { updates["max_resumes"] = *req.MaxResumes }
		if req.ExportCount != nil { updates["export_count"] = *req.ExportCount }
		if req.DailyLimitTokens != nil { updates["daily_limit_tokens"] = *req.DailyLimitTokens }
		if req.MonthlyLimitTokens != nil { updates["monthly_limit_tokens"] = *req.MonthlyLimitTokens }

		if len(updates) == 0 {
			respondError(c, http.StatusBadRequest, "请至少提供一项配额")
			return
		}
		updates["updated_at"] = time.Now()
		if err := database.DB.Model(&models.UserQuota{}).Where("user_id = ?", userID).Updates(updates).Error; err != nil {
			respondError(c, http.StatusInternalServerError, "更新配额失败")
			return
		}
	}

	// Audit log
	detail, _ := json.Marshal(req)
	recordAuditLog(adminID, adminName, "quota_update", "user", userID, c.Query("username"), string(detail), c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "配额更新成功"})
}

func DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	// Prevent self-deletion
	if userID == adminID {
		respondError(c, http.StatusBadRequest, "不能删除自己")
		return
	}

	var u models.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err != nil {
		respondError(c, http.StatusNotFound, "用户不存在")
		return
	}

	// Soft delete
	if err := database.DB.Where("id = ?", userID).Delete(&models.User{}).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "删除失败")
		return
	}

	recordAuditLog(adminID, adminName, "user_delete", "user", userID, u.Username, "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "用户已删除"})
}

func BatchDeleteUsers(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)
	ip := c.ClientIP()

	for _, id := range req.IDs {
		if id == adminID { continue }
		var u models.User
		if err := database.DB.Where("id = ?", id).First(&u).Error; err != nil {
			continue
		}
		database.DB.Where("id = ?", id).Delete(&models.User{})
		recordAuditLog(adminID, adminName, "user_delete", "user", id, u.Username, "", ip)
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("已删除 %d 个用户", len(req.IDs))})
}

func UpdateUserRole(c *gin.Context) {
	userID := c.Param("id")
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	if userID == adminID {
		respondError(c, http.StatusBadRequest, "不能修改自己的角色")
		return
	}

	var req UpdateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请提供角色")
		return
	}

	if req.Role != "user" && req.Role != "admin" {
		respondError(c, http.StatusBadRequest, "角色仅支持 user 或 admin")
		return
	}

	var u models.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err != nil {
		respondError(c, http.StatusNotFound, "用户不存在")
		return
	}

	oldRole := u.Role
	if err := database.DB.Model(&u).Updates(map[string]any{
		"role": req.Role, "token_version": gorm.Expr("token_version + 1"),
	}).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "角色更新失败")
		return
	}

	detail := fmt.Sprintf(`{"old_role": "%s", "new_role": "%s"}`, oldRole, req.Role)
	recordAuditLog(adminID, adminName, "role_update", "user", userID, u.Username, detail, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "角色更新成功"})
}

func ForceLogoutUser(c *gin.Context) {
	userID := c.Param("id")
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	var u models.User
	if err := database.DB.Where("id = ?", userID).First(&u).Error; err != nil {
		respondError(c, http.StatusNotFound, "用户不存在")
		return
	}

	if err := database.DB.Model(&u).Update("token_version", gorm.Expr("token_version + 1")).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "强制下线失败")
		return
	}

	recordAuditLog(adminID, adminName, "force_logout", "user", userID, u.Username, "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "用户已强制下线"})
}

func ResetUserPassword(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")
		adminID := middleware.GetUserID(c)
		adminName := middleware.GetUsername(c)

		var req ResetPasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请提供新密码")
			return
		}

		if len(req.NewPassword) < 6 {
			respondError(c, http.StatusBadRequest, "新密码长度不能少于 6 位")
			return
		}

		var u models.User
		if err := database.DB.Where("id = ?", userID).First(&u).Error; err != nil {
			respondError(c, http.StatusNotFound, "用户不存在")
			return
		}

		hashed, err := utils.HashPassword(req.NewPassword)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "密码加密失败")
			return
		}

		if err := database.DB.Model(&u).Updates(map[string]any{
			"password": hashed, "token_version": gorm.Expr("token_version + 1"),
		}).Error; err != nil {
			respondError(c, http.StatusInternalServerError, "密码重置失败")
			return
		}

		recordAuditLog(adminID, adminName, "password_reset", "user", userID, u.Username, "", c.ClientIP())

		c.JSON(http.StatusOK, gin.H{"message": "密码重置成功，用户所有登录会话已失效"})
	}
}

// ============================================================
//  AI Model Pool Management
// ============================================================

type CreateModelPoolRequest struct {
	Name      string `json:"name" binding:"required"`
	ApiUrl    string `json:"api_url" binding:"required"`
	ApiKey    string `json:"api_key" binding:"required"`
	Model     string `json:"model" binding:"required"`
	SortOrder int    `json:"sort_order"`
	IsActive  *bool  `json:"is_active"`
}

type UpdateModelPoolRequest struct {
	Name      *string `json:"name"`
	ApiUrl    *string `json:"api_url"`
	ApiKey    *string `json:"api_key"`
	Model     *string `json:"model"`
	SortOrder *int    `json:"sort_order"`
	IsActive  *bool   `json:"is_active"`
}

func ListModelPoolsAdmin(c *gin.Context) {
	var pools []models.AIModelPool
	database.DB.Order("sort_order ASC, created_at DESC").Find(&pools)

	type poolItem struct {
		ID               string  `json:"id"`
		Name             string  `json:"name"`
		ApiUrl           string  `json:"api_url"`
		Model            string  `json:"model"`
		Balance          float64 `json:"balance"`
		BalanceUpdatedAt string  `json:"balance_updated_at"`
		IsActive         bool    `json:"is_active"`
		SortOrder        int     `json:"sort_order"`
		CreatedAt        string  `json:"created_at"`
		UpdatedAt        string  `json:"updated_at"`
		UserCount        int64   `json:"user_count"`
	}

	items := make([]poolItem, 0, len(pools))
	for _, p := range pools {
		var userCount int64
		database.DB.Model(&models.AIServiceConfig{}).
			Where("public_model_id = ?", p.ID).Count(&userCount)

		bu := ""
		if p.BalanceUpdatedAt != nil {
			bu = p.BalanceUpdatedAt.Format("2006-01-02 15:04")
		}
		items = append(items, poolItem{
			ID: p.ID, Name: p.Name, ApiUrl: p.ApiUrl, Model: p.Model,
			Balance: p.Balance, BalanceUpdatedAt: bu,
			IsActive: p.IsActive, SortOrder: p.SortOrder,
			CreatedAt: p.CreatedAt.Format("2006-01-02 15:04"),
			UpdatedAt: p.UpdatedAt.Format("2006-01-02 15:04"),
			UserCount: userCount,
		})
	}

	c.JSON(http.StatusOK, gin.H{"models": items})
}

func CreateModelPool(c *gin.Context) {
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	var req CreateModelPoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请填写完整信息")
		return
	}

	isActive := true
	if req.IsActive != nil { isActive = *req.IsActive }

	pool := models.AIModelPool{
		Name: req.Name, ApiUrl: req.ApiUrl, ApiKey: req.ApiKey,
		Model: req.Model, SortOrder: req.SortOrder, IsActive: isActive,
	}
	if err := database.DB.Create(&pool).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "创建失败")
		return
	}

	recordAuditLog(adminID, adminName, "model_create", "ai_model_pool", pool.ID, pool.Name, "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "模型创建成功", "id": pool.ID})
}

func UpdateModelPool(c *gin.Context) {
	id := c.Param("id")
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	var req UpdateModelPoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	updates := map[string]any{}
	if req.Name != nil { updates["name"] = *req.Name }
	if req.ApiUrl != nil { updates["api_url"] = *req.ApiUrl }
	if req.ApiKey != nil { updates["api_key"] = *req.ApiKey }
	if req.Model != nil { updates["model"] = *req.Model }
	if req.SortOrder != nil { updates["sort_order"] = *req.SortOrder }
	if req.IsActive != nil { updates["is_active"] = *req.IsActive }

	if len(updates) == 0 {
		respondError(c, http.StatusBadRequest, "请至少提供一项更新")
		return
	}

	if err := database.DB.Model(&models.AIModelPool{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "更新失败")
		return
	}

	recordAuditLog(adminID, adminName, "model_update", "ai_model_pool", id, "", "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "模型更新成功"})
}

func DeleteModelPool(c *gin.Context) {
	id := c.Param("id")
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	// Check if any user is using this model
	var userCount int64
	database.DB.Model(&models.AIServiceConfig{}).Where("public_model_id = ?", id).Count(&userCount)
	if userCount > 0 {
		respondError(c, http.StatusBadRequest, fmt.Sprintf("有 %d 个用户正在使用此模型，无法删除", userCount))
		return
	}

	var pool models.AIModelPool
	if err := database.DB.Where("id = ?", id).First(&pool).Error; err != nil {
		respondError(c, http.StatusNotFound, "模型不存在")
		return
	}

	if err := database.DB.Delete(&pool).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "删除失败")
		return
	}

	recordAuditLog(adminID, adminName, "model_delete", "ai_model_pool", id, pool.Name, "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "模型已删除"})
}

// ============================================================
//  Changelog Management
// ============================================================

type CreateChangelogRequest struct {
	Version     string   `json:"version" binding:"required"`
	Date        string   `json:"date" binding:"required"`
	Title       string   `json:"title" binding:"required"`
	Summary     string   `json:"summary"`
	Items       []string `json:"items" binding:"required"`
	Tone        string   `json:"tone"`
	IsPublished *bool    `json:"is_published"`
	SortOrder   int      `json:"sort_order"`
}

type UpdateChangelogRequest struct {
	Version     *string  `json:"version"`
	Date        *string  `json:"date"`
	Title       *string  `json:"title"`
	Summary     *string  `json:"summary"`
	Items       *[]string `json:"items"`
	Tone        *string  `json:"tone"`
	IsPublished *bool    `json:"is_published"`
	SortOrder   *int     `json:"sort_order"`
}

func ListChangelogsAdmin(c *gin.Context) {
	var entries []models.ChangelogEntry
	database.DB.Order("sort_order ASC, created_at DESC").Find(&entries)

	type entryItem struct {
		ID          string   `json:"id"`
		Version     string   `json:"version"`
		Date        string   `json:"date"`
		Title       string   `json:"title"`
		Summary     string   `json:"summary"`
		Items       []string `json:"items"`
		Tone        string   `json:"tone"`
		IsPublished bool     `json:"is_published"`
		SortOrder   int      `json:"sort_order"`
		CreatedAt   string   `json:"created_at"`
		UpdatedAt   string   `json:"updated_at"`
	}

	result := make([]entryItem, 0, len(entries))
	for _, e := range entries {
		var items []string
		if e.Items != "" {
			json.Unmarshal([]byte(e.Items), &items)
		}
		tone := e.Tone
		if tone == "" { tone = "blue" }
		result = append(result, entryItem{
			ID: e.ID, Version: e.Version, Date: e.Date, Title: e.Title,
			Summary: e.Summary, Items: items, Tone: tone,
			IsPublished: e.IsPublished, SortOrder: e.SortOrder,
			CreatedAt: e.CreatedAt.Format("2006-01-02 15:04"),
			UpdatedAt: e.UpdatedAt.Format("2006-01-02 15:04"),
		})
	}

	c.JSON(http.StatusOK, gin.H{"entries": result})
}

func CreateChangelog(c *gin.Context) {
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	var req CreateChangelogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请填写完整信息")
		return
	}

	tone := req.Tone
	if tone == "" { tone = "blue" }

	itemsJSON, _ := json.Marshal(req.Items)
	isPublished := false
	if req.IsPublished != nil { isPublished = *req.IsPublished }

	entry := models.ChangelogEntry{
		Version: req.Version, Date: req.Date, Title: req.Title,
		Summary: req.Summary, Items: string(itemsJSON),
		Tone: tone, IsPublished: isPublished, SortOrder: req.SortOrder,
	}

	if err := database.DB.Create(&entry).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "创建失败")
		return
	}

	recordAuditLog(adminID, adminName, "changelog_create", "changelog", entry.ID, entry.Title, "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "更新日志创建成功", "id": entry.ID})
}

func UpdateChangelog(c *gin.Context) {
	id := c.Param("id")
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	var req UpdateChangelogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请求参数格式错误")
		return
	}

	updates := map[string]any{}
	if req.Version != nil { updates["version"] = *req.Version }
	if req.Date != nil { updates["date"] = *req.Date }
	if req.Title != nil { updates["title"] = *req.Title }
	if req.Summary != nil { updates["summary"] = *req.Summary }
	if req.Items != nil {
		itemsJSON, _ := json.Marshal(*req.Items)
		updates["items"] = string(itemsJSON)
	}
	if req.Tone != nil { updates["tone"] = *req.Tone }
	if req.IsPublished != nil { updates["is_published"] = *req.IsPublished }
	if req.SortOrder != nil { updates["sort_order"] = *req.SortOrder }

	if len(updates) == 0 {
		respondError(c, http.StatusBadRequest, "请至少提供一项更新")
		return
	}

	if err := database.DB.Model(&models.ChangelogEntry{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "更新失败")
		return
	}

	recordAuditLog(adminID, adminName, "changelog_update", "changelog", id, "", "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "更新日志修改成功"})
}

func DeleteChangelog(c *gin.Context) {
	id := c.Param("id")
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	if err := database.DB.Where("id = ?", id).Delete(&models.ChangelogEntry{}).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "删除失败")
		return
	}

	recordAuditLog(adminID, adminName, "changelog_delete", "changelog", id, "", "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "更新日志已删除"})
}

// --- Public changelog API (no auth) ---
func ListPublishedChangelogs(c *gin.Context) {
	var entries []models.ChangelogEntry
	database.DB.Where("is_published = true").Order("sort_order ASC, created_at DESC").Find(&entries)

	type entryItem struct {
		ID      string   `json:"id"`
		Version string   `json:"version"`
		Date    string   `json:"date"`
		Title   string   `json:"title"`
		Summary string   `json:"summary"`
		Items   []string `json:"items"`
		Tone    string   `json:"tone"`
	}

	result := make([]entryItem, 0, len(entries))
	for _, e := range entries {
		var items []string
		if e.Items != "" {
			json.Unmarshal([]byte(e.Items), &items)
		}
		tone := e.Tone
		if tone == "" { tone = "blue" }
		result = append(result, entryItem{
			ID: e.ID, Version: e.Version, Date: e.Date, Title: e.Title,
			Summary: e.Summary, Items: items, Tone: tone,
		})
	}

	c.JSON(http.StatusOK, gin.H{"entries": result})
}

// ============================================================
//  Global AI Usage Stats
// ============================================================

type AdminAIUsageResponse struct {
	Today       aiUsageTotals           `json:"today"`
	Month       aiUsageTotals           `json:"month"`
	Total       aiUsageTotals           `json:"total"`
	Providers   []aiUsageBreakdown      `json:"providers"`
	Models      []aiUsageModelBreakdown `json:"models"`
	DailyTrend  []aiUsageDailyTrend     `json:"daily_trend"`
	TopUsers    []UserUsageItem         `json:"top_users"`
	MonthLabel  string                  `json:"month_label"`
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
	if err != nil { monthStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()) }
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
	if since != nil { query = query.Where("created_at >= ?", *since) }
	if until != nil { query = query.Where("created_at < ?", *until) }
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
		if row.Key == "" { row.Key = "other" }
		row.Label = providerLabels[row.Key]
		if row.Label == "" { row.Label = row.Key }
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
	for i, r := range rows { userIDs[i] = r.UserID }
	var users []models.User
	database.DB.Where("id IN ?", userIDs).Find(&users)
	userMap := map[string]models.User{}
	for _, u := range users { userMap[u.ID] = u }

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
	if err != nil { monthStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()) }
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
		Models: listModelUsage(userID, filters),
		Recent: recent, RecentTotal: recentTotal,
		DailyTrend: listDailyTrend(userID, filters),
		MonthLabel: monthStr,
	})
}

// ============================================================
//  Audit Log
// ============================================================

func ListAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	action := strings.TrimSpace(c.Query("action"))

	if page < 1 { page = 1 }
	if size < 1 || size > 100 { size = 20 }

	query := database.DB.Model(&models.AdminAuditLog{})
	if action != "" { query = query.Where("action = ?", action) }

	var total int64
	query.Session(&gorm.Session{}).Count(&total)

	var logs []models.AdminAuditLog
	query.Order("created_at DESC").Offset((page - 1) * size).Limit(size).Find(&logs)

	c.JSON(http.StatusOK, gin.H{"logs": logs, "total": total, "page": page, "size": size})
}

// ============================================================
//  Helpers
// ============================================================

func recordAuditLog(adminID, adminName, action, targetType, targetID, targetName, detail, ip string) {
	entry := models.AdminAuditLog{
		AdminID: adminID, AdminName: adminName,
		Action: action, TargetType: targetType,
		TargetID: targetID, TargetName: targetName,
		Detail: detail, IP: ip,
	}
	if err := database.DB.Create(&entry).Error; err != nil {
		log.Printf("[audit] failed to record audit log: %v", err)
	}
}
