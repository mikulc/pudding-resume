package models

import (
	"time"

	"gorm.io/datatypes"
)

// ThemeLibrary 主题库表 — 排版/视觉风格预设方案
type ThemeLibrary struct {
	ID            UUID           `json:"id" gorm:"type:uuid;primaryKey;comment:样式唯一标识（UUID v4）"`
	Name          string         `json:"name" gorm:"size:128;not null;comment:样式名称（如 布丁·浅岚、布丁·青蓝）"`
	LayoutID      string         `json:"layout_id" gorm:"size:32;not null;index;comment:对应的排版布局ID"`
	Categories    datatypes.JSON `json:"categories" gorm:"not null;comment:视觉样式分类（JSON字符串数组）"`
	Highlights    datatypes.JSON `json:"highlights" gorm:"comment:样式亮点标签（JSON数组）"`
	PreviewColors datatypes.JSON `json:"preview_colors" gorm:"comment:预览颜色（JSON对象：headerBg / accentBar / bodyBg）"`
	SortOrder     int            `json:"sort_order" gorm:"default:0;comment:排序权重，越小越靠前"`
	CreatedAt     time.Time      `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt     time.Time      `json:"updated_at" gorm:"comment:更新时间"`
}

func (ThemeLibrary) TableName() string {
	return "theme_library"
}

// TemplateLibrary 模板库表 — 存放面向行业/岗位的简历内容快照。
// 模板引用一个默认主题；创建简历后，内容和主题都会保存到用户简历，
// 后续模板更新不会影响已经创建的简历。
type TemplateLibrary struct {
	ID             UUID           `json:"id" gorm:"type:uuid;primaryKey;comment:模板唯一标识（UUID v4）"`
	Name           string         `json:"name" gorm:"size:128;not null;comment:模板名称"`
	Industry       string         `json:"industry" gorm:"size:64;not null;default:'通用';index;comment:适用行业"`
	Categories     datatypes.JSON `json:"categories" gorm:"not null;comment:行业与岗位分类"`
	Highlights     datatypes.JSON `json:"highlights" gorm:"not null;comment:模板亮点"`
	Content        datatypes.JSON `json:"content" gorm:"not null;comment:ResumeData 内容快照"`
	DefaultThemeID UUID           `json:"default_theme_id" gorm:"type:uuid;not null;index;comment:默认主题ID"`
	DefaultTheme   *ThemeLibrary  `json:"default_theme,omitempty" gorm:"foreignKey:DefaultThemeID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
	Status         string         `json:"status" gorm:"size:16;not null;default:'published';index;comment:发布状态"`
	Version        int            `json:"version" gorm:"not null;default:1;comment:模板版本"`
	SortOrder      int            `json:"sort_order" gorm:"default:0;comment:排序权重，越小越靠前"`
	CreatedAt      time.Time      `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt      time.Time      `json:"updated_at" gorm:"comment:更新时间"`
}

func (TemplateLibrary) TableName() string {
	return "template_library"
}
