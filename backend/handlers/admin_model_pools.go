package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
)

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
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

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
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.ApiUrl != nil {
		updates["api_url"] = *req.ApiUrl
	}
	if req.ApiKey != nil {
		updates["api_key"] = *req.ApiKey
	}
	if req.Model != nil {
		updates["model"] = *req.Model
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

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
