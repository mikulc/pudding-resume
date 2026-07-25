package handlers

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
)

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
	Version     *string   `json:"version"`
	Date        *string   `json:"date"`
	Title       *string   `json:"title"`
	Summary     *string   `json:"summary"`
	Items       *[]string `json:"items"`
	Tone        *string   `json:"tone"`
	IsPublished *bool     `json:"is_published"`
	SortOrder   *int      `json:"sort_order"`
}

func changelogPublishedOrDefault(value *bool) bool {
	if value == nil {
		return true
	}
	return *value
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
		if tone == "" {
			tone = "blue"
		}
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
	if tone == "" {
		tone = "blue"
	}

	itemsJSON, _ := json.Marshal(req.Items)
	isPublished := changelogPublishedOrDefault(req.IsPublished)

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
	if req.Version != nil {
		updates["version"] = *req.Version
	}
	if req.Date != nil {
		updates["date"] = *req.Date
	}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Summary != nil {
		updates["summary"] = *req.Summary
	}
	if req.Items != nil {
		itemsJSON, _ := json.Marshal(*req.Items)
		updates["items"] = string(itemsJSON)
	}
	if req.Tone != nil {
		updates["tone"] = *req.Tone
	}
	if req.IsPublished != nil {
		updates["is_published"] = *req.IsPublished
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

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
		if tone == "" {
			tone = "blue"
		}
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
