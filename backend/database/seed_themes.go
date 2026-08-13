package database

import (
	"errors"
	"gorm.io/gorm"
	"log"
	"pudding-resume-backend/models"
)

func seedThemeLibraries() {
	entries := []models.ThemeLibrary{
		{
			ID:         models.NewUUID(),
			Name:       "现代极简",
			LayoutID:   "skyveil",
			Categories: []string{"清新", "单栏"},
			SortOrder:  1,
		},
		{
			ID:         models.NewUUID(),
			Name:       "蓝标细线",
			LayoutID:   "cyanblu",
			Categories: []string{"简约", "商务", "单栏"},
			SortOrder:  2,
		},
		{
			ID:         models.NewUUID(),
			Name:       "黑白简约",
			LayoutID:   "ordrin",
			Categories: []string{"简约", "单栏"},
			SortOrder:  3,
		},
		{
			ID:         models.NewUUID(),
			Name:       "浅蓝侧栏",
			LayoutID:   "left-sidebar-two-column",
			Categories: []string{"现代", "双栏"},
			SortOrder:  4,
		},
		{
			ID:         models.NewUUID(),
			Name:       "居中简约",
			LayoutID:   "centerline",
			Categories: []string{"简约", "单栏"},
			SortOrder:  5,
		},
		{
			ID:         models.NewUUID(),
			Name:       "横线单栏",
			LayoutID:   "classic-horizontal",
			Categories: []string{"经典", "商务", "单栏"},
			SortOrder:  6,
		},
		{
			ID:         models.NewUUID(),
			Name:       "蓝标横线",
			LayoutID:   "blueprint-icons",
			Categories: []string{"现代", "图标"},
			SortOrder:  7,
		},
		{
			ID:         models.NewUUID(),
			Name:       "灰条分区",
			LayoutID:   "monochrome-rings",
			Categories: []string{"创意", "单栏"},
			SortOrder:  8,
		},
		{
			ID:         models.NewUUID(),
			Name:       "弧顶标签",
			LayoutID:   "teal-ribbon-wave",
			Categories: []string{"创意", "现代"},
			SortOrder:  9,
		},
		{
			ID:         models.NewUUID(),
			Name:       "深蓝页眉",
			LayoutID:   "blue-banner-icons",
			Categories: []string{"商务", "单栏"},
			SortOrder:  10,
		},
		{
			ID:         models.NewUUID(),
			Name:       "蓝色侧栏",
			LayoutID:   "azure-sidebar",
			Categories: []string{"现代", "商务", "双栏"},
			SortOrder:  11,
		},
	}

	for _, e := range entries {
		if e.LayoutID != "left-sidebar-two-column" {
			continue
		}
		if err := DB.Model(&models.ThemeLibrary{}).
			Where("layout_id = ?", "kusen").
			Updates(map[string]any{
				"name":       e.Name,
				"layout_id":  e.LayoutID,
				"sort_order": e.SortOrder,
			}).Error; err != nil {
			log.Printf("Warning: failed to migrate theme library layout_id kusen: %v", err)
		}
		break
	}

	inserted := 0
	updated := 0
	for _, e := range entries {
		var existing models.ThemeLibrary
		err := DB.Where("layout_id = ?", e.LayoutID).First(&existing).Error
		if err == nil {
			if err := DB.Model(&existing).Updates(map[string]any{
				"name":       e.Name,
				"sort_order": e.SortOrder,
			}).Error; err != nil {
				log.Printf("Warning: failed to update theme library entry %s: %v", e.LayoutID, err)
				continue
			}
			if err := syncThemeCategoryNames(DB, existing.ID, e.Categories); err != nil {
				log.Printf("Warning: failed to sync theme categories for %s: %v", e.LayoutID, err)
			}
			updated++
			continue
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			log.Printf("Warning: failed to check theme library entry %s: %v", e.LayoutID, err)
			continue
		}
		if err := DB.Create(&e).Error; err != nil {
			log.Printf("Warning: failed to seed theme library entry %s: %v", e.Name, err)
			continue
		}
		if err := syncThemeCategoryNames(DB, e.ID, e.Categories); err != nil {
			log.Printf("Warning: failed to sync theme categories for %s: %v", e.LayoutID, err)
		}
		inserted++
	}

	if inserted > 0 {
		log.Printf("Theme library seeded: %d missing entries inserted", inserted)
	}
	if updated > 0 {
		log.Printf("Theme library synced: %d built-in entries updated", updated)
	}
}

func syncThemeCategoryNames(db *gorm.DB, themeID models.UUID, names []string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var relationCount int64
		if err := tx.Model(&models.ThemeCategoryRelation{}).Where("theme_id = ?", themeID).Count(&relationCount).Error; err != nil {
			return err
		}
		if relationCount > 0 {
			return nil
		}
		order := 0
		for _, name := range names {
			// Column count is a layout signature, not a managed visual category.
			if name == "单栏" || name == "双栏" {
				continue
			}
			category := models.ThemeCategory{Name: name}
			err := tx.Where("name = ?", name).First(&category).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				category = models.ThemeCategory{
					Name: name, Status: "enabled", SortOrder: order,
				}
				err = tx.Create(&category).Error
			}
			if err != nil {
				return err
			}
			relation := models.ThemeCategoryRelation{ThemeID: themeID, CategoryID: category.ID, SortOrder: order}
			if err := tx.Create(&relation).Error; err != nil {
				return err
			}
			order++
		}
		return nil
	})
}
