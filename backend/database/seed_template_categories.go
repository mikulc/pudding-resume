package database

import (
	"errors"
	"log"

	"gorm.io/gorm"

	"pudding-resume-backend/models"
)

// Built-in template categories replace the former frontend constant. They are
// inserted only when missing so administrator changes are preserved.
func builtInTemplateCategories() []models.TemplateCategory {
	return []models.TemplateCategory{
		{Name: "互联网通用", Code: "internet-general", Status: "enabled", SortOrder: 1},
		{Name: "前端开发", Code: "frontend-development", Status: "enabled", SortOrder: 2},
		{Name: "后端开发", Code: "backend-development", Status: "enabled", SortOrder: 3},
		{Name: "Golang", Code: "golang", Status: "enabled", SortOrder: 4},
		{Name: "Java", Code: "java", Status: "enabled", SortOrder: 5},
		{Name: "C++", Code: "cpp", Status: "enabled", SortOrder: 6},
		{Name: "校招", Code: "campus-recruitment", Status: "enabled", SortOrder: 7},
		{Name: "实习", Code: "internship", Status: "enabled", SortOrder: 8},
		{Name: "社招", Code: "social-recruitment", Status: "enabled", SortOrder: 9},
	}
}

func seedTemplateCategories() {
	inserted := 0
	for _, category := range builtInTemplateCategories() {
		var existing models.TemplateCategory
		err := DB.Where("name = ? OR code = ?", category.Name, category.Code).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("Warning: failed to check template category %s: %v", category.Name, err)
			continue
		}
		if err := DB.Create(&category).Error; err != nil {
			log.Printf("Warning: failed to seed template category %s: %v", category.Name, err)
			continue
		}
		inserted++
	}
	if inserted > 0 {
		log.Printf("Template categories seeded: %d missing entries inserted", inserted)
	}
}
