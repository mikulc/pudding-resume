package models

import (
	"time"

	"gorm.io/datatypes"
)

// DocumentSetting 文档设置表 — 存储可配置的文档设置参数（预设颜色、水印颜色、滑块范围、默认值等）
// Category 字段将同类设置分组（如 "preset_colors"、"watermark_colors"、"theme_defaults"）
type DocumentSetting struct {
	ID        string         `json:"id" gorm:"primaryKey;size:64;comment:设置唯一标识（如 preset_colors / watermark_colors）"`
	Category  string         `json:"category" gorm:"size:32;not null;index;comment:设置分类（preset_colors / watermark_colors / theme_defaults / page_ranges / watermark_ranges / layout_defaults）"`
	Label     string         `json:"label" gorm:"size:64;comment:中文展示标签"`
	Data      datatypes.JSON `json:"data" gorm:"type:jsonb;not null;comment:设置详情（JSON格式，结构因 category 不同而异）"`
	SortOrder int            `json:"sort_order" gorm:"default:0;comment:排序权重，越小越靠前"`
	CreatedAt time.Time      `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"comment:更新时间"`
}

func (DocumentSetting) TableName() string {
	return "doc_settings"
}
