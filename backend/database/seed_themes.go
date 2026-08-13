package database

import (
	"errors"
	"gorm.io/gorm"
	"log"
	"pudding-resume-backend/models"
)

func seedThemeLibraries() {
	type previewColors struct {
		HeaderBg  string `json:"headerBg"`
		AccentBar string `json:"accentBar"`
		BodyBg    string `json:"bodyBg"`
		SectionBg string `json:"sectionBg"`
	}

	entries := []models.ThemeLibrary{
		{
			ID:            models.NewUUID(),
			Name:          "现代极简",
			LayoutID:      "skyveil",
			Categories:    []string{"清新", "单栏"},
			Highlights:    marshalJSON([]string{"清爽通栏", "层级清晰", "通用版式"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#DBEAFE", AccentBar: "#3B82F6", BodyBg: "#FFFFFF", SectionBg: "#F3F4F6"}),
			SortOrder:     1,
		},
		{
			ID:            models.NewUUID(),
			Name:          "蓝标细线",
			LayoutID:      "cyanblu",
			Categories:    []string{"简约", "商务", "单栏"},
			Highlights:    marshalJSON([]string{"青蓝点缀", "图标标题", "细线分割"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#1e3a5f", BodyBg: "#FFFFFF", SectionBg: "#F3F4F6"}),
			SortOrder:     2,
		},
		{
			ID:            models.NewUUID(),
			Name:          "黑白简约",
			LayoutID:      "ordrin",
			Categories:    []string{"简约", "单栏"},
			Highlights:    marshalJSON([]string{"黑白极简", "ATS 友好", "信息密度高"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#1a1a1a", BodyBg: "#FFFFFF", SectionBg: "#F3F4F6"}),
			SortOrder:     3,
		},
		{
			ID:            models.NewUUID(),
			Name:          "浅蓝侧栏",
			LayoutID:      "left-sidebar-two-column",
			Categories:    []string{"现代", "双栏"},
			Highlights:    marshalJSON([]string{"侧栏信息", "彩色标题", "产品岗风格"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#EEF3FB", AccentBar: "#248f83", BodyBg: "#FFFFFF", SectionBg: "#EEF3FB"}),
			SortOrder:     4,
		},
		{
			ID:            models.NewUUID(),
			Name:          "居中简约",
			LayoutID:      "centerline",
			Categories:    []string{"简约", "单栏"},
			Highlights:    marshalJSON([]string{"居中抬头", "纯白单栏", "ATS 友好"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#000000", BodyBg: "#FFFFFF", SectionBg: "#F5F5F5"}),
			SortOrder:     5,
		},
		{
			ID:            models.NewUUID(),
			Name:          "横线单栏",
			LayoutID:      "classic-horizontal",
			Categories:    []string{"经典", "商务", "单栏"},
			Highlights:    marshalJSON([]string{"横线单栏", "黑白单栏", "高密度内容"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#333333", BodyBg: "#FFFFFF", SectionBg: "#F5F5F5"}),
			SortOrder:     6,
		},
		{
			ID:            models.NewUUID(),
			Name:          "蓝标横线",
			LayoutID:      "blueprint-icons",
			Categories:    []string{"现代", "图标"},
			Highlights:    marshalJSON([]string{"圆形图标标题", "浅蓝细线", "证件照抬头"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#3B82F6", BodyBg: "#FFFFFF", SectionBg: "#E8F0FF"}),
			SortOrder:     7,
		},
		{
			ID:            models.NewUUID(),
			Name:          "灰条分区",
			LayoutID:      "monochrome-rings",
			Categories:    []string{"创意", "单栏"},
			Highlights:    marshalJSON([]string{"黑色竖杠", "灰色横条", "居中抬头"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#F0F0F0", AccentBar: "#000000", BodyBg: "#FFFFFF", SectionBg: "#F0F0F0"}),
			SortOrder:     8,
		},
		{
			ID:            models.NewUUID(),
			Name:          "弧顶标签",
			LayoutID:      "teal-ribbon-wave",
			Categories:    []string{"创意", "现代"},
			Highlights:    marshalJSON([]string{"弧形页眉", "圆形头像", "青绿标签"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#4388F6", AccentBar: "#248f83", BodyBg: "#FFFFFF", SectionBg: "#E7F2F2"}),
			SortOrder:     9,
		},
		{
			ID:            models.NewUUID(),
			Name:          "深蓝页眉",
			LayoutID:      "blue-banner-icons",
			Categories:    []string{"商务", "单栏"},
			Highlights:    marshalJSON([]string{"深蓝通栏", "深蓝圆标", "高密度正文"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#1e3a5f", AccentBar: "#1e3a5f", BodyBg: "#FFFFFF", SectionBg: "#F5F5F5"}),
			SortOrder:     10,
		},
		{
			ID:            models.NewUUID(),
			Name:          "蓝色侧栏",
			LayoutID:      "azure-sidebar",
			Categories:    []string{"现代", "商务", "双栏"},
			Highlights:    marshalJSON([]string{"蓝色侧栏", "双栏结构", "主栏细线标题"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#3B82F6", AccentBar: "#3B82F6", BodyBg: "#FFFFFF", SectionBg: "#EEF5FF"}),
			SortOrder:     11,
		},
	}

	for _, e := range entries {
		if e.LayoutID != "left-sidebar-two-column" {
			continue
		}
		if err := DB.Model(&models.ThemeLibrary{}).
			Where("layout_id = ?", "kusen").
			Updates(map[string]any{
				"name":           e.Name,
				"layout_id":      e.LayoutID,
				"highlights":     e.Highlights,
				"preview_colors": e.PreviewColors,
				"sort_order":     e.SortOrder,
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
				"name":           e.Name,
				"highlights":     e.Highlights,
				"preview_colors": e.PreviewColors,
				"sort_order":     e.SortOrder,
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
					Name: name, Code: normalizedCategoryCode("theme", name),
					Type: "style", Status: "enabled", SortOrder: order,
				}
				if name == "图标" {
					category.Type = "feature"
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
