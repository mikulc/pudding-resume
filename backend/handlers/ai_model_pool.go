package handlers

import (
	"errors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
)

// PublicModelItem 用户端可见的公共模型信息（不含 API Key）
type PublicModelItem struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Model            string  `json:"model"`
	Balance          float64 `json:"balance"`
	BalanceUpdatedAt string  `json:"balance_updated_at"`
	SortOrder        int     `json:"sort_order"`
}

type ListPublicModelsResponse struct {
	Models []PublicModelItem `json:"models"`
}

// ListPublicModels handles GET /api/ai/model-pools (requires auth)
// Returns all active public models for users to choose from (API key NOT exposed).
func ListPublicModels(c *gin.Context) {
	var pools []models.AIModelPool
	if err := database.DB.Where("is_active = true").Order("sort_order ASC, created_at DESC").Find(&pools).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "查询公共模型列表失败")
		return
	}

	result := make([]PublicModelItem, 0, len(pools))
	for i := range pools {
		result = append(result, PublicModelItem{
			ID:               pools[i].ID,
			Name:             pools[i].Name,
			Model:            pools[i].Model,
			Balance:          pools[i].Balance,
			BalanceUpdatedAt: formatBalanceTime(pools[i].BalanceUpdatedAt),
			SortOrder:        pools[i].SortOrder,
		})
	}

	c.JSON(http.StatusOK, ListPublicModelsResponse{Models: result})
}

// GetModelBalance handles GET /api/ai/model-pools/:id/balance (requires auth)
// Returns the current balance for a specific public model from DB.
func GetModelBalance(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		respondError(c, http.StatusBadRequest, "缺少模型ID")
		return
	}

	var pool models.AIModelPool
	if err := database.DB.Where("id = ? AND is_active = true", id).First(&pool).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(c, http.StatusNotFound, "公共模型不存在或已禁用")
		} else {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 pool.ID,
		"name":               pool.Name,
		"balance":            pool.Balance,
		"balance_updated_at": formatBalanceTime(pool.BalanceUpdatedAt),
	})
}
