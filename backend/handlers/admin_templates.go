package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
)

const maxTemplateImportCount = 100

type adminTemplateInput struct {
	Name           string          `json:"name"`
	CategoryIDs    []string        `json:"category_ids"`
	Categories     []string        `json:"categories"` // legacy JSON-import compatibility
	Content        json.RawMessage `json:"content"`
	DefaultThemeID string          `json:"default_theme_id"`
	Status         string          `json:"status"`
	SortOrder      int             `json:"sort_order"`
}

type adminTemplateImportRequest struct {
	Templates []adminTemplateInput `json:"templates" binding:"required"`
}

func templatePreloads(query *gorm.DB) *gorm.DB {
	return query.
		Preload("DefaultTheme").
		Preload("CategoryEntries", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, name ASC")
		})
}

func hydrateTemplate(entry *models.TemplateLibrary) {
	entry.HydrateCategories()
}

// ListAdminTemplates returns drafts and published templates for management.
func ListAdminTemplates(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	search := strings.TrimSpace(c.Query("search"))
	status := strings.TrimSpace(c.Query("status"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}

	query := database.DB.Model(&models.TemplateLibrary{})
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		categoryMatches := database.DB.Model(&models.TemplateCategoryRelation{}).
			Select("template_category_relation.template_id").
			Joins("JOIN template_category ON template_category.id = template_category_relation.category_id").
			Where("LOWER(template_category.name) LIKE ?", like)
		query = query.Where("LOWER(template_library.name) LIKE ? OR template_library.id IN (?)", like, categoryMatches)
	}
	if status == "published" || status == "draft" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取模板列表失败"})
		return
	}
	var entries []models.TemplateLibrary
	if err := templatePreloads(query).Order("sort_order ASC, updated_at DESC").
		Offset((page - 1) * size).Limit(size).Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "获取模板列表失败"})
		return
	}
	for index := range entries {
		hydrateTemplate(&entries[index])
	}
	c.JSON(http.StatusOK, gin.H{"templates": entries, "total": total, "page": page, "size": size})
}

// CreateAdminTemplate creates one template and its category relations atomically.
func CreateAdminTemplate(c *gin.Context) {
	var input adminTemplateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "模板 JSON 格式错误"})
		return
	}
	entry, err := buildTemplate(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := ensureThemeExists(tx, entry.DefaultThemeID); err != nil {
			return err
		}
		categories, err := resolveTemplateCategories(tx, input)
		if err != nil {
			return err
		}
		if err := tx.Create(&entry).Error; err != nil {
			return err
		}
		return replaceTemplateCategoryRelations(tx, entry.ID, categories)
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	templatePreloads(database.DB).First(&entry, "id = ?", entry.ID)
	hydrateTemplate(&entry)
	c.JSON(http.StatusCreated, gin.H{"template": entry})
}

// ImportAdminTemplates imports up to 100 templates atomically.
func ImportAdminTemplates(c *gin.Context) {
	var request adminTemplateImportRequest
	if err := c.ShouldBindJSON(&request); err != nil || len(request.Templates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "请选择包含 templates 数组的 JSON 文件"})
		return
	}
	if len(request.Templates) > maxTemplateImportCount {
		c.JSON(http.StatusBadRequest, gin.H{"message": "单次最多导入 100 个模板"})
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		for index, input := range request.Templates {
			entry, err := buildTemplate(input)
			if err != nil {
				return errors.New("第 " + strconv.Itoa(index+1) + " 个模板：" + err.Error())
			}
			if err := ensureThemeExists(tx, entry.DefaultThemeID); err != nil {
				return errors.New("第 " + strconv.Itoa(index+1) + " 个模板：" + err.Error())
			}
			categories, err := resolveTemplateCategories(tx, input)
			if err != nil {
				return errors.New("第 " + strconv.Itoa(index+1) + " 个模板：" + err.Error())
			}
			if err := tx.Create(&entry).Error; err != nil {
				return err
			}
			if err := replaceTemplateCategoryRelations(tx, entry.ID, categories); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "模板导入成功", "count": len(request.Templates)})
}

// UpdateAdminTemplate replaces editable fields and category relations atomically.
func UpdateAdminTemplate(c *gin.Context) {
	var entry models.TemplateLibrary
	if err := database.DB.First(&entry, "id = ?", c.Param("id")).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"message": "模板不存在"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "读取模板失败"})
		return
	}

	var input adminTemplateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "模板 JSON 格式错误"})
		return
	}
	updated, err := buildTemplate(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := ensureThemeExists(tx, updated.DefaultThemeID); err != nil {
			return err
		}
		categories, err := resolveTemplateCategories(tx, input)
		if err != nil {
			return err
		}
		updates := map[string]any{
			"name": updated.Name, "content": updated.Content,
			"default_theme_id": updated.DefaultThemeID,
			"status":           updated.Status, "sort_order": updated.SortOrder,
		}
		if err := tx.Model(&entry).Updates(updates).Error; err != nil {
			return err
		}
		return replaceTemplateCategoryRelations(tx, entry.ID, categories)
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	templatePreloads(database.DB).First(&entry, "id = ?", entry.ID)
	hydrateTemplate(&entry)
	c.JSON(http.StatusOK, gin.H{"template": entry})
}

func DeleteAdminTemplate(c *gin.Context) {
	result := database.DB.Delete(&models.TemplateLibrary{}, "id = ?", c.Param("id"))
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "删除模板失败"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "模板不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "模板已删除"})
}

func buildTemplate(input adminTemplateInput) (models.TemplateLibrary, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.DefaultThemeID = strings.TrimSpace(input.DefaultThemeID)
	input.Status = strings.TrimSpace(input.Status)
	if input.Name == "" || len([]rune(input.Name)) > 128 {
		return models.TemplateLibrary{}, errors.New("模板名称必填且不能超过 128 个字符")
	}
	if input.DefaultThemeID == "" {
		return models.TemplateLibrary{}, errors.New("请选择默认主题")
	}
	if input.Status == "" {
		input.Status = "published"
	}
	if input.Status != "published" && input.Status != "draft" {
		return models.TemplateLibrary{}, errors.New("状态仅支持 published 或 draft")
	}
	if len(cleanStringList(input.CategoryIDs)) == 0 && len(cleanStringList(input.Categories)) == 0 {
		return models.TemplateLibrary{}, errors.New("请至少选择一个分类")
	}
	if len(input.Content) == 0 || bytes.Equal(bytes.TrimSpace(input.Content), []byte("null")) || !json.Valid(input.Content) {
		return models.TemplateLibrary{}, errors.New("content 必须是有效的简历 JSON 对象")
	}
	var contentObject map[string]any
	if err := json.Unmarshal(input.Content, &contentObject); err != nil || contentObject == nil {
		return models.TemplateLibrary{}, errors.New("content 必须是有效的简历 JSON 对象")
	}
	if _, ok := contentObject["personalInfo"].(map[string]any); !ok {
		return models.TemplateLibrary{}, errors.New("content 缺少有效的 personalInfo")
	}
	for _, field := range []string{"education", "workExperience", "projects"} {
		if _, ok := contentObject[field].([]any); !ok {
			return models.TemplateLibrary{}, errors.New("content 缺少有效的 " + field)
		}
	}
	if _, ok := contentObject["skills"].(string); !ok {
		return models.TemplateLibrary{}, errors.New("content 缺少有效的 skills")
	}
	return models.TemplateLibrary{
		Name: input.Name, Content: datatypes.JSON(input.Content),
		DefaultThemeID: models.UUID(input.DefaultThemeID),
		Status:         input.Status, SortOrder: input.SortOrder,
	}, nil
}

func resolveTemplateCategories(tx *gorm.DB, input adminTemplateInput) ([]models.TemplateCategory, error) {
	ids := cleanStringList(input.CategoryIDs)
	var categories []models.TemplateCategory
	if len(ids) > 0 {
		if err := tx.Where("id IN ? AND status = ?", ids, "enabled").Find(&categories).Error; err != nil {
			return nil, errors.New("校验模板分类失败")
		}
		if len(categories) != len(ids) {
			return nil, errors.New("部分模板分类不存在或已停用")
		}
		byID := make(map[string]models.TemplateCategory, len(categories))
		for _, category := range categories {
			byID[string(category.ID)] = category
		}
		ordered := make([]models.TemplateCategory, 0, len(ids))
		for _, id := range ids {
			ordered = append(ordered, byID[id])
		}
		return ordered, nil
	}

	names := cleanStringList(input.Categories)
	if err := tx.Where("name IN ? AND status = ?", names, "enabled").Find(&categories).Error; err != nil {
		return nil, errors.New("校验模板分类失败")
	}
	if len(categories) != len(names) {
		return nil, errors.New("导入文件包含尚未创建或已停用的模板分类")
	}
	byName := make(map[string]models.TemplateCategory, len(categories))
	for _, category := range categories {
		byName[category.Name] = category
	}
	ordered := make([]models.TemplateCategory, 0, len(names))
	for _, name := range names {
		ordered = append(ordered, byName[name])
	}
	return ordered, nil
}

func replaceTemplateCategoryRelations(tx *gorm.DB, templateID models.UUID, categories []models.TemplateCategory) error {
	if err := tx.Where("template_id = ?", templateID).Delete(&models.TemplateCategoryRelation{}).Error; err != nil {
		return err
	}
	relations := make([]models.TemplateCategoryRelation, 0, len(categories))
	for index, category := range categories {
		relations = append(relations, models.TemplateCategoryRelation{
			TemplateID: templateID, CategoryID: category.ID, SortOrder: index,
		})
	}
	return tx.Create(&relations).Error
}

func cleanStringList(values []string) []string {
	cleaned := make([]string, 0, len(values))
	seen := make(map[string]struct{})
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		cleaned = append(cleaned, value)
	}
	return cleaned
}

func ensureThemeExists(tx *gorm.DB, id models.UUID) error {
	var count int64
	if err := tx.Model(&models.ThemeLibrary{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return errors.New("校验默认主题失败")
	}
	if count == 0 {
		return errors.New("默认主题不存在")
	}
	return nil
}
