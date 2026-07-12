package models

import (
	"time"

	"gorm.io/datatypes"
)

// StyleLibrary 样式库表 — 排版/视觉风格预设方案
type StyleLibrary struct {
	ID            string         `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:样式唯一标识（UUID v4）"`
	Name          string         `json:"name" gorm:"size:128;not null;comment:样式名称（如 布丁·浅岚、布丁·青蓝）"`
	Description   string         `json:"description" gorm:"type:text;comment:样式描述"`
	LayoutID      string         `json:"layout_id" gorm:"size:32;not null;index;comment:对应的排版布局ID"`
	Category      string         `json:"category" gorm:"size:32;default:'';index;comment:样式分类（如 商务、极简、技术）"`
	Highlights    datatypes.JSON `json:"highlights" gorm:"type:jsonb;comment:样式亮点标签（JSON数组）"`
	PreviewColors datatypes.JSON `json:"preview_colors" gorm:"type:jsonb;comment:预览颜色（JSON对象：headerBg / accentBar / bodyBg）"`
	SortOrder     int            `json:"sort_order" gorm:"default:0;comment:排序权重，越小越靠前"`
	CreatedAt     time.Time      `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt     time.Time      `json:"updated_at" gorm:"comment:更新时间"`
}

func (StyleLibrary) TableName() string {
	return "style_library"
}
