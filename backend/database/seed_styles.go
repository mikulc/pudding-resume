package database

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"log"
	"pudding-resume-backend/models"
)

func seedStyleLibraries() {
	type previewColors struct {
		HeaderBg  string `json:"headerBg"`
		AccentBar string `json:"accentBar"`
		BodyBg    string `json:"bodyBg"`
		SectionBg string `json:"sectionBg"`
	}

	entries := []models.StyleLibrary{
		{
			ID:            uuid.New().String(),
			Name:          "浅蓝通栏",
			LayoutID:      "skyveil",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"清爽通栏", "层级清晰", "通用版式"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#DBEAFE", AccentBar: "#3B82F6", BodyBg: "#FFFFFF", SectionBg: "#F3F4F6"}),
			SortOrder:     1,
		},
		{
			ID:            uuid.New().String(),
			Name:          "青蓝圆标",
			LayoutID:      "cyanblu",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"青蓝点缀", "图标标题", "细线分割"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#1e3a5f", BodyBg: "#FFFFFF", SectionBg: "#F3F4F6"}),
			SortOrder:     2,
		},
		{
			ID:            uuid.New().String(),
			Name:          "黑白简线",
			LayoutID:      "ordrin",
			Category:      "极简",
			Highlights:    marshalJSON([]string{"黑白极简", "ATS 友好", "信息密度高"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#1a1a1a", BodyBg: "#FFFFFF", SectionBg: "#F3F4F6"}),
			SortOrder:     3,
		},
		{
			ID:            uuid.New().String(),
			Name:          "青影侧栏",
			LayoutID:      "left-sidebar-two-column",
			Category:      "互联网",
			Highlights:    marshalJSON([]string{"侧栏信息", "彩色标题", "产品岗风格"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#EEF3FB", AccentBar: "#248f83", BodyBg: "#FFFFFF", SectionBg: "#EEF3FB"}),
			SortOrder:     4,
		},
		{
			ID:            uuid.New().String(),
			Name:          "居中单栏",
			LayoutID:      "centerline",
			Category:      "极简",
			Highlights:    marshalJSON([]string{"居中抬头", "纯白单栏", "ATS 友好"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#000000", BodyBg: "#FFFFFF", SectionBg: "#F5F5F5"}),
			SortOrder:     5,
		},
		{
			ID:            uuid.New().String(),
			Name:          "经典横线",
			LayoutID:      "classic-horizontal",
			Category:      "极简",
			Highlights:    marshalJSON([]string{"经典横线", "黑白单栏", "高密度内容"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#333333", BodyBg: "#FFFFFF", SectionBg: "#F5F5F5"}),
			SortOrder:     6,
		},
		{
			ID:            uuid.New().String(),
			Name:          "蓝环职线",
			LayoutID:      "blueprint-icons",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"圆形图标标题", "浅蓝细线", "证件照抬头"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#4F8CFF", BodyBg: "#FFFFFF", SectionBg: "#E8F0FF"}),
			SortOrder:     7,
		},
		{
			ID:            uuid.New().String(),
			Name:          "黑杠灰条",
			LayoutID:      "monochrome-rings",
			Category:      "极简",
			Highlights:    marshalJSON([]string{"黑色竖杠", "灰色横条", "居中抬头"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#F0F0F0", AccentBar: "#111111", BodyBg: "#FFFFFF", SectionBg: "#F0F0F0"}),
			SortOrder:     8,
		},
		{
			ID:            uuid.New().String(),
			Name:          "弧顶青签",
			LayoutID:      "teal-ribbon-wave",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"弧形页眉", "圆形头像", "青绿标签"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#4388F6", AccentBar: "#168B8C", BodyBg: "#FFFFFF", SectionBg: "#E7F2F2"}),
			SortOrder:     9,
		},
		{
			ID:            uuid.New().String(),
			Name:          "蓝幕圆标",
			LayoutID:      "blue-banner-icons",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"深蓝通栏", "深蓝圆标", "高密度正文"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#1e3a5f", AccentBar: "#1e3a5f", BodyBg: "#FFFFFF", SectionBg: "#F5F5F5"}),
			SortOrder:     10,
		},
		{
			ID:            uuid.New().String(),
			Name:          "蔚蓝侧栏",
			LayoutID:      "azure-sidebar",
			Category:      "技术",
			Highlights:    marshalJSON([]string{"蓝色侧栏", "双栏结构", "主栏细线标题"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#4388F6", AccentBar: "#4388F6", BodyBg: "#FFFFFF", SectionBg: "#EEF5FF"}),
			SortOrder:     11,
		},
	}

	for _, e := range entries {
		if e.LayoutID != "left-sidebar-two-column" {
			continue
		}
		if err := DB.Model(&models.StyleLibrary{}).
			Where("layout_id = ?", "kusen").
			Updates(map[string]any{
				"name":           e.Name,
				"layout_id":      e.LayoutID,
				"category":       e.Category,
				"highlights":     e.Highlights,
				"preview_colors": e.PreviewColors,
				"sort_order":     e.SortOrder,
			}).Error; err != nil {
			log.Printf("Warning: failed to migrate style library layout_id kusen: %v", err)
		}
		break
	}

	inserted := 0
	updated := 0
	for _, e := range entries {
		var existing models.StyleLibrary
		err := DB.Where("layout_id = ?", e.LayoutID).First(&existing).Error
		if err == nil {
			if err := DB.Model(&existing).Updates(map[string]any{
				"name":           e.Name,
				"category":       e.Category,
				"highlights":     e.Highlights,
				"preview_colors": e.PreviewColors,
				"sort_order":     e.SortOrder,
			}).Error; err != nil {
				log.Printf("Warning: failed to update style library entry %s: %v", e.LayoutID, err)
				continue
			}
			updated++
			continue
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			log.Printf("Warning: failed to check style library entry %s: %v", e.LayoutID, err)
			continue
		}
		if err := DB.Create(&e).Error; err != nil {
			log.Printf("Warning: failed to seed style library entry %s: %v", e.Name, err)
			continue
		}
		inserted++
	}

	if inserted > 0 {
		log.Printf("Style library seeded: %d missing entries inserted", inserted)
	}
	if updated > 0 {
		log.Printf("Style library synced: %d built-in entries updated", updated)
	}
}

// seedDemoContent populates the demo_content table with a sample resume
// if the table is currently empty (safe to call on every server start).
