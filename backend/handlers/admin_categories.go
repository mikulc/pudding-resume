package handlers

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
)

type adminCategoryInput struct {
	Name      string `json:"name"`
	Code      string `json:"code"`
	Type      string `json:"type"`
	Status    string `json:"status"`
	SortOrder int    `json:"sort_order"`
}

type adminCategorySelection struct {
	CategoryIDs []string `json:"category_ids"`
}

func normalizeCategoryInput(input adminCategoryInput, prefix string, withType bool) (adminCategoryInput, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Code = strings.ToLower(strings.TrimSpace(input.Code))
	input.Type = strings.TrimSpace(input.Type)
	input.Status = strings.TrimSpace(input.Status)
	if input.Name == "" || len([]rune(input.Name)) > 64 {
		return input, errors.New("分类名称必填且不能超过 64 个字符")
	}
	if input.Code == "" {
		sum := sha256.Sum256([]byte(strings.ToLower(input.Name)))
		input.Code = fmt.Sprintf("%s-%x", prefix, sum[:8])
	}
	if len(input.Code) > 64 {
		return input, errors.New("分类编码不能超过 64 个字符")
	}
	if input.Status == "" {
		input.Status = "enabled"
	}
	if input.Status != "enabled" && input.Status != "disabled" {
		return input, errors.New("分类状态仅支持 enabled 或 disabled")
	}
	if withType {
		if input.Type == "" {
			input.Type = "style"
		}
		if input.Type != "style" && input.Type != "feature" {
			return input, errors.New("主题分类类型仅支持 style 或 feature")
		}
	}
	return input, nil
}

func ListAdminTemplateCategories(c *gin.Context) {
	var entries []models.TemplateCategory
	if err := database.DB.Order("sort_order ASC, name ASC").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取模板分类失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": entries})
}

func CreateAdminTemplateCategory(c *gin.Context) {
	var input adminCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "分类数据格式错误"})
		return
	}
	input, err := normalizeCategoryInput(input, "template", false)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	entry := models.TemplateCategory{Name: input.Name, Code: input.Code, Status: input.Status, SortOrder: input.SortOrder}
	if err := database.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"message": "分类名称或编码已存在"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"category": entry})
}

func UpdateAdminTemplateCategory(c *gin.Context) {
	var entry models.TemplateCategory
	if err := database.DB.First(&entry, "id = ?", c.Param("id")).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"message": "模板分类不存在"})
		return
	}
	var input adminCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "分类数据格式错误"})
		return
	}
	input, err := normalizeCategoryInput(input, "template", false)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if err := database.DB.Model(&entry).Updates(map[string]any{
		"name": input.Name, "code": input.Code, "status": input.Status, "sort_order": input.SortOrder,
	}).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"message": "分类名称或编码已存在"})
		return
	}
	database.DB.First(&entry, "id = ?", entry.ID)
	c.JSON(http.StatusOK, gin.H{"category": entry})
}

func DeleteAdminTemplateCategory(c *gin.Context) {
	deleteCategory(c, &models.TemplateCategory{}, &models.TemplateCategoryRelation{}, "category_id", "模板分类")
}

func ListAdminThemeCategories(c *gin.Context) {
	var entries []models.ThemeCategory
	if err := database.DB.Order("sort_order ASC, name ASC").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取主题分类失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": entries})
}

func CreateAdminThemeCategory(c *gin.Context) {
	var input adminCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "分类数据格式错误"})
		return
	}
	input, err := normalizeCategoryInput(input, "theme", true)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	entry := models.ThemeCategory{Name: input.Name, Code: input.Code, Type: input.Type, Status: input.Status, SortOrder: input.SortOrder}
	if err := database.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"message": "分类名称或编码已存在"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"category": entry})
}

func UpdateAdminThemeCategory(c *gin.Context) {
	var entry models.ThemeCategory
	if err := database.DB.First(&entry, "id = ?", c.Param("id")).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"message": "主题分类不存在"})
		return
	}
	var input adminCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "分类数据格式错误"})
		return
	}
	input, err := normalizeCategoryInput(input, "theme", true)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if err := database.DB.Model(&entry).Updates(map[string]any{
		"name": input.Name, "code": input.Code, "type": input.Type,
		"status": input.Status, "sort_order": input.SortOrder,
	}).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"message": "分类名称或编码已存在"})
		return
	}
	database.DB.First(&entry, "id = ?", entry.ID)
	c.JSON(http.StatusOK, gin.H{"category": entry})
}

func DeleteAdminThemeCategory(c *gin.Context) {
	deleteCategory(c, &models.ThemeCategory{}, &models.ThemeCategoryRelation{}, "category_id", "主题分类")
}

// ListAdminThemes returns themes with managed category names and IDs.
func ListAdminThemes(c *gin.Context) {
	var entries []models.ThemeLibrary
	if err := database.DB.Preload("CategoryEntries", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC, name ASC")
	}).Order("sort_order ASC, id ASC").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取主题列表失败"})
		return
	}
	for index := range entries {
		entries[index].HydrateCategories()
	}
	c.JSON(http.StatusOK, gin.H{"themes": entries})
}

// UpdateAdminThemeCategories replaces a theme's managed visual categories.
func UpdateAdminThemeCategories(c *gin.Context) {
	var input adminCategorySelection
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "分类数据格式错误"})
		return
	}
	ids := cleanStringList(input.CategoryIDs)
	if len(ids) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "请至少选择一个主题分类"})
		return
	}
	var theme models.ThemeLibrary
	if err := database.DB.First(&theme, "id = ?", c.Param("id")).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"message": "主题不存在"})
		return
	}
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var categories []models.ThemeCategory
		if err := tx.Where("id IN ? AND status = ?", ids, "enabled").Find(&categories).Error; err != nil {
			return errors.New("校验主题分类失败")
		}
		if len(categories) != len(ids) {
			return errors.New("部分主题分类不存在或已停用")
		}
		byID := make(map[string]models.ThemeCategory, len(categories))
		for _, category := range categories {
			byID[string(category.ID)] = category
		}
		if err := tx.Where("theme_id = ?", theme.ID).Delete(&models.ThemeCategoryRelation{}).Error; err != nil {
			return err
		}
		for index, id := range ids {
			relation := models.ThemeCategoryRelation{
				ThemeID: theme.ID, CategoryID: byID[id].ID, SortOrder: index,
			}
			if err := tx.Create(&relation).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if err := database.DB.Preload("CategoryEntries", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC, name ASC")
	}).First(&theme, "id = ?", theme.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "读取主题失败"})
		return
	}
	theme.HydrateCategories()
	c.JSON(http.StatusOK, gin.H{"theme": theme})
}

func deleteCategory(c *gin.Context, categoryModel, relationModel any, foreignKey, label string) {
	var references int64
	if err := database.DB.Model(relationModel).Where(foreignKey+" = ?", c.Param("id")).Count(&references).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "检查分类引用失败"})
		return
	}
	if references > 0 {
		c.JSON(http.StatusConflict, gin.H{"message": fmt.Sprintf("该%s正被 %d 条记录使用，请先迁移引用", label, references)})
		return
	}
	result := database.DB.Delete(categoryModel, "id = ?", c.Param("id"))
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "删除分类失败"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": label + "不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": label + "已删除"})
}
