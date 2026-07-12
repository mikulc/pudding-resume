package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
)

// GetDocSettings returns all document settings, optionally filtered by category.
// GET /api/doc-settings?category=preset_colors
func GetDocSettings(c *gin.Context) {
	category := c.Query("category")

	query := database.DB.Order("sort_order ASC, id ASC")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var settings []models.DocumentSetting
	if err := query.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取文档设置失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"settings": settings})
}
