package database

import (
	"gorm.io/gorm"
	"log"
	"pudding-resume-backend/models"
)

func seedDocSettings() {
	type presetColor struct {
		Color string `json:"color"`
		Label string `json:"label,omitempty"`
	}

	type layoutDefault struct {
		LayoutID string `json:"layout_id"`
		Color    string `json:"color"`
	}

	type themeDefault struct {
		PageMargin  float64 `json:"page_margin"`
		LineSpacing float64 `json:"line_spacing"`
		FontSize    float64 `json:"font_size"`
	}

	type customColorDefault struct {
		Bg      string `json:"bg"`
		Border  string `json:"border"`
		TagBg   string `json:"tag_bg"`
		TagText string `json:"tag_text"`
	}

	type pageRange struct {
		Key     string  `json:"key"`
		Min     float64 `json:"min"`
		Max     float64 `json:"max"`
		Step    float64 `json:"step"`
		Unit    string  `json:"unit"`
		Default float64 `json:"default"`
		Label   string  `json:"label"`
	}

	type watermarkRange struct {
		Key     string  `json:"key"`
		Min     float64 `json:"min"`
		Max     float64 `json:"max"`
		Step    float64 `json:"step"`
		Unit    string  `json:"unit"`
		Default float64 `json:"default"`
		Label   string  `json:"label"`
	}

	type densityOption struct {
		Value string `json:"value"`
		Label string `json:"label"`
	}

	settings := []models.DocumentSetting{
		// ---- Preset colors (主题颜色预设色板) ----
		{
			ID: "preset_colors", Category: "preset_colors", Label: "预设主题色",
			Data: marshalJSON([]presetColor{
				{Color: "#3B82F6", Label: "蓝色"},
				{Color: "#1e3a5f", Label: "深蓝"},
				{Color: "#000000", Label: "黑色"},
				{Color: "#248f83", Label: "陶土红"},
				{Color: "#2890ca", Label: "孔雀蓝"},
				{Color: "#75b35d", Label: "草绿"},
				{Color: "#5c95c1", Label: "灰蓝"},
				{Color: "#4079a1", Label: "深青蓝"},
				{Color: "#f9a22c", Label: "暖橙"},
				{Color: "#bf9f6c", Label: "卡其金"},
				{Color: "#9861db", Label: "紫罗兰"},
				{Color: "#555968", Label: "石板灰"},
				{Color: "#c76b8b", Label: "玫瑰红"},
				{Color: "#4a8c7e", Label: "青瓷绿"},
				{Color: "#8b6b4a", Label: "焦糖棕"},
				{Color: "#6b7db3", Label: "薰衣草蓝"},
			}),
			SortOrder: 1,
		},
		// ---- Watermark colors (水印颜色选项) ----
		{
			ID: "watermark_colors", Category: "watermark_colors", Label: "水印颜色",
			Data: marshalJSON([]presetColor{
				{Color: "#9CA3AF", Label: "浅灰"},
				{Color: "#6B7280", Label: "中灰"},
				{Color: "#EF4444", Label: "红色"},
				{Color: "#3B82F6", Label: "蓝色"},
				{Color: "#10B981", Label: "绿色"},
			}),
			SortOrder: 2,
		},
		// ---- Custom color defaults (自定义颜色默认值) ----
		{
			ID: "custom_color_defaults", Category: "theme_defaults", Label: "自定义颜色默认值",
			Data: marshalJSON(customColorDefault{
				Bg: "#DBEAFE", Border: "#3B82F6", TagBg: "#EFF6FF", TagText: "#2563EB",
			}),
			SortOrder: 3,
		},
		// ---- Layout default colors (每个布局的默认主色) ----
		{
			ID: "layout_default_colors", Category: "layout_defaults", Label: "布局默认主色",
			Data: marshalJSON([]layoutDefault{
				{LayoutID: "skyveil", Color: "#3B82F6"},
				{LayoutID: "cyanblu", Color: "#1e3a5f"},
				{LayoutID: "ordrin", Color: "#000000"},
				{LayoutID: "left-sidebar-two-column", Color: "#248f83"},
				{LayoutID: "centerline", Color: "#000000"},
				{LayoutID: "classic-horizontal", Color: "#333333"},
				{LayoutID: "blueprint-icons", Color: "#3B82F6"},
				{LayoutID: "monochrome-rings", Color: "#000000"},
				{LayoutID: "teal-ribbon-wave", Color: "#248f83"},
				{LayoutID: "blue-banner-icons", Color: "#1e3a5f"},
				{LayoutID: "azure-sidebar", Color: "#3B82F6"},
			}),
			SortOrder: 4,
		},
		// ---- Theme defaults (主题默认值) ----
		{
			ID: "theme_defaults", Category: "theme_defaults", Label: "主题默认值",
			Data: marshalJSON(themeDefault{
				PageMargin: 15, LineSpacing: 1.6, FontSize: 13,
			}),
			SortOrder: 5,
		},
		// ---- Page setting ranges (滑块范围) ----
		{
			ID: "page_ranges", Category: "page_ranges", Label: "页面设置滑块范围",
			Data: marshalJSON([]pageRange{
				{Key: "pageMargin", Min: 10, Max: 30, Step: 1, Unit: "mm", Default: 15, Label: "页边距"},
				{Key: "lineSpacing", Min: 1.0, Max: 2.4, Step: 0.05, Unit: "", Default: 1.6, Label: "行间距"},
				{Key: "fontSize", Min: 11, Max: 16, Step: 1, Unit: "px", Default: 13, Label: "字体大小"},
			}),
			SortOrder: 6,
		},
		// ---- Watermark setting ranges (水印滑块范围) ----
		{
			ID: "watermark_ranges", Category: "watermark_ranges", Label: "水印设置滑块范围",
			Data: marshalJSON([]watermarkRange{
				{Key: "opacity", Min: 0.03, Max: 0.3, Step: 0.01, Unit: "%", Default: 0.08, Label: "透明度"},
				{Key: "fontSize", Min: 1, Max: 48, Step: 1, Unit: "px", Default: 26, Label: "字体大小"},
				{Key: "rotation", Min: -90, Max: 0, Step: 5, Unit: "°", Default: -30, Label: "旋转角度"},
			}),
			SortOrder: 7,
		},
		// ---- Watermark density options (水印密度选项) ----
		{
			ID: "watermark_density", Category: "watermark_ranges", Label: "水印密度选项",
			Data: marshalJSON([]densityOption{
				{Value: "low", Label: "稀疏"},
				{Value: "medium", Label: "适中"},
				{Value: "high", Label: "密集"},
			}),
			SortOrder: 8,
		},
		// ---- Watermark defaults (水印默认值) ----
		{
			ID: "watermark_defaults", Category: "watermark_ranges", Label: "水印默认值",
			Data: marshalJSON(map[string]any{
				"enabled":  true,
				"content":  "布丁简历",
				"opacity":  0.08,
				"fontSize": 26,
				"rotation": -30,
				"color":    "#6B7280",
				"density":  "medium",
			}),
			SortOrder: 9,
		},
	}

	synced := 0
	for _, s := range settings {
		var existing models.DocumentSetting
		err := DB.Where("id = ?", s.ID).First(&existing).Error
		if err == nil {
			if err := DB.Model(&existing).Updates(map[string]any{
				"category":   s.Category,
				"label":      s.Label,
				"data":       s.Data,
				"sort_order": s.SortOrder,
			}).Error; err != nil {
				log.Printf("Warning: failed to update doc_setting %s: %v", s.ID, err)
				continue
			}
			synced++
			continue
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			log.Printf("Warning: failed to check doc_setting %s: %v", s.ID, err)
			continue
		}
		if err := DB.Create(&s).Error; err != nil {
			log.Printf("Warning: failed to seed doc_setting %s: %v", s.ID, err)
			continue
		}
		synced++
	}

	if synced > 0 {
		log.Printf("Document settings synced: %d rows upserted", synced)
	}
}
