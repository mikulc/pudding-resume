package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"pudding-resume-backend/utils"
	"strconv"
	"strings"
	"time"
)

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

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}

	baseQuery := database.DB.Model(&models.User{})

	// Include soft-deleted if requested
	if includeDeleted {
		baseQuery = baseQuery.Unscoped()
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
	for i, u := range dbUsers {
		userIDs[i] = u.ID
	}

	// Fetch quotas in batch
	var quotas []models.UserQuota
	database.DB.Where("user_id IN ?", userIDs).Find(&quotas)
	quotaMap := map[string]models.UserQuota{}
	for _, q := range quotas {
		quotaMap[q.UserID] = q
	}

	// Fetch resume counts in batch
	type countRow struct {
		UserID string
		Count  int64
	}
	var counts []countRow
	database.DB.Model(&models.Resume{}).Where("user_id IN ?", userIDs).
		Select("user_id, COUNT(*) as count").Group("user_id").Scan(&counts)
	countMap := map[string]int64{}
	for _, c := range counts {
		countMap[c.UserID] = c.Count
	}

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
			CreatedAt:   u.CreatedAt.Format("2006-01-02 15:04"),
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
	if u.DeletedAt.Valid {
		status = "deleted"
	}
	lastLogin := ""
	if u.LastLoginAt != nil {
		lastLogin = u.LastLoginAt.Format("2006-01-02 15:04")
	}
	lastActive := ""
	if !s.LastActiveAt.IsZero() {
		lastActive = s.LastActiveAt.Format("2006-01-02 15:04")
	}

	c.JSON(http.StatusOK, AdminUserDetailResponse{
		AdminUserItem: AdminUserItem{
			ID: u.ID, Username: u.Username, Email: u.Email,
			Avatar: buildAvatarURL(u.Avatar), Role: u.Role, Status: status,
			CreatedAt:   u.CreatedAt.Format("2006-01-02 15:04"),
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
			if req.MaxResumes != nil {
				q.MaxResumes = *req.MaxResumes
			}
			if req.ExportCount != nil {
				q.ExportCount = *req.ExportCount
			}
			if req.DailyLimitTokens != nil {
				q.DailyLimitTokens = *req.DailyLimitTokens
			}
			if req.MonthlyLimitTokens != nil {
				q.MonthlyLimitTokens = *req.MonthlyLimitTokens
			}
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
		if req.MaxResumes != nil {
			updates["max_resumes"] = *req.MaxResumes
		}
		if req.ExportCount != nil {
			updates["export_count"] = *req.ExportCount
		}
		if req.DailyLimitTokens != nil {
			updates["daily_limit_tokens"] = *req.DailyLimitTokens
		}
		if req.MonthlyLimitTokens != nil {
			updates["monthly_limit_tokens"] = *req.MonthlyLimitTokens
		}

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

// DeleteUser deactivates a user with a reversible soft delete.
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

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", userID).Delete(&models.ResumeShare{}).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.User{}).Where("id = ?", userID).
			Update("token_version", gorm.Expr("token_version + 1")).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", userID).Delete(&models.User{}).Error
	}); err != nil {
		respondError(c, http.StatusInternalServerError, "删除失败")
		return
	}

	recordAuditLog(adminID, adminName, "user_deactivate", "user", userID, u.Username, "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "用户已停用"})
}

// RestoreUser restores a soft-deleted account if its email and username have
// not since been claimed by another active account.
func RestoreUser(c *gin.Context) {
	userID := c.Param("id")
	adminID := middleware.GetUserID(c)
	adminName := middleware.GetUsername(c)

	user, err := findUserIncludingDeleted(userID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		respondError(c, http.StatusNotFound, "用户不存在")
		return
	}
	if err != nil {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}
	if !user.DeletedAt.Valid {
		respondError(c, http.StatusConflict, "用户当前处于正常状态")
		return
	}

	err = database.DB.Unscoped().Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]any{
			"deleted_at":    nil,
			"token_version": gorm.Expr("token_version + 1"),
		}).Error
	if err != nil {
		if _, conflict := registrationConflictMessage(err); conflict {
			respondError(c, http.StatusConflict, "邮箱或用户名已被新的账号使用，不能恢复")
			return
		}
		respondError(c, http.StatusInternalServerError, "恢复失败")
		return
	}

	recordAuditLog(adminID, adminName, "user_restore", "user", userID, user.Username, "", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"message": "用户已恢复"})
}

// PermanentlyDeleteUser irreversibly deletes the account and all user-owned
// rows. The audit entry is written after commit so the operation stays atomic.
func PermanentlyDeleteUser(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")
		adminID := middleware.GetUserID(c)
		adminName := middleware.GetUsername(c)
		if userID == adminID {
			respondError(c, http.StatusBadRequest, "不能永久删除自己")
			return
		}

		user, err := findUserIncludingDeleted(userID)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(c, http.StatusNotFound, "用户不存在")
			return
		}
		if err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		if err := database.DB.Transaction(func(tx *gorm.DB) error {
			return permanentlyDeleteUser(tx, userID)
		}); err != nil {
			respondError(c, http.StatusInternalServerError, "永久删除失败")
			return
		}

		removeAvatarFile(cfg.UploadDir, user.Avatar)
		recordAuditLog(adminID, adminName, "user_permanent_delete", "user", userID, user.Username, "", c.ClientIP())
		c.JSON(http.StatusOK, gin.H{"message": "用户及其关联数据已永久删除"})
	}
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

	deletedCount := 0
	for _, id := range req.IDs {
		if id == adminID {
			continue
		}
		var u models.User
		if err := database.DB.Where("id = ?", id).First(&u).Error; err != nil {
			continue
		}
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Where("user_id = ?", id).Delete(&models.ResumeShare{}).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.User{}).Where("id = ?", id).
				Update("token_version", gorm.Expr("token_version + 1")).Error; err != nil {
				return err
			}
			return tx.Where("id = ?", id).Delete(&models.User{}).Error
		})
		if err != nil {
			continue
		}
		deletedCount++
		recordAuditLog(adminID, adminName, "user_deactivate", "user", id, u.Username, "", ip)
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("已停用 %d 个用户", deletedCount)})
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
