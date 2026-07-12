package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"

	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
)

// GetStyleLibraries returns all style library entries.
// GET /api/templates/styles
func GetStyleLibraries(c *gin.Context) {
	var entries []models.StyleLibrary
	if err := database.DB.Order("sort_order ASC, id ASC").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取样式库失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"templates": entries})
}

// GetDemoContent returns the demo resume content.
// GET /api/templates/demo-content
func GetDemoContent(c *gin.Context) {
	var demo models.DemoContent
	if err := database.DB.Take(&demo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "示例内容不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"content":    json.RawMessage(demo.Content),
		"updated_at": demo.UpdatedAt.Format("2006-01-02 15:04:05"),
	})
}
