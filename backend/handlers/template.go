package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
)

// GetThemeLibraries returns all published resume themes.
// GET /api/themes
func GetThemeLibraries(c *gin.Context) {
	var entries []models.ThemeLibrary
	if err := database.DB.Preload("CategoryEntries", func(db *gorm.DB) *gorm.DB {
		return db.Where("status = ?", "enabled").Order("sort_order ASC, name ASC")
	}).Order("sort_order ASC, id ASC").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取主题库失败"})
		return
	}
	for index := range entries {
		entries[index].HydrateCategories()
	}
	c.JSON(http.StatusOK, gin.H{"themes": entries})
}

// GetTemplateLibraries returns all published industry/position templates.
// GET /api/templates
func GetTemplateLibraries(c *gin.Context) {
	var entries []models.TemplateLibrary
	if err := database.DB.
		Preload("DefaultTheme").
		Preload("DefaultTheme.CategoryEntries", func(db *gorm.DB) *gorm.DB {
			return db.Where("status = ?", "enabled").Order("sort_order ASC, name ASC")
		}).
		Preload("CategoryEntries", func(db *gorm.DB) *gorm.DB {
			return db.Where("status = ?", "enabled").Order("sort_order ASC, name ASC")
		}).
		Where("status = ?", "published").
		Order("sort_order ASC, id ASC").
		Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取模板库失败"})
		return
	}
	for index := range entries {
		entries[index].HydrateCategories()
		if entries[index].DefaultTheme != nil {
			entries[index].DefaultTheme.HydrateCategories()
		}
	}
	c.JSON(http.StatusOK, gin.H{"templates": entries})
}

// GetTemplateCategories returns enabled template categories in configured order.
// GET /api/template-categories
func GetTemplateCategories(c *gin.Context) {
	var entries []models.TemplateCategory
	if err := database.DB.
		Where("status = ?", "enabled").
		Order("sort_order ASC, name ASC").
		Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取模板分类失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": entries})
}
