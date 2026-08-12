package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
)

// GetThemeLibraries returns all published resume themes.
// GET /api/themes
func GetThemeLibraries(c *gin.Context) {
	var entries []models.ThemeLibrary
	if err := database.DB.Order("sort_order ASC, id ASC").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取主题库失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"themes": entries})
}

// GetTemplateLibraries returns all published industry/position templates.
// GET /api/templates
func GetTemplateLibraries(c *gin.Context) {
	var entries []models.TemplateLibrary
	if err := database.DB.
		Preload("DefaultTheme").
		Where("status = ?", "published").
		Order("sort_order ASC, id ASC").
		Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取模板库失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"templates": entries})
}
