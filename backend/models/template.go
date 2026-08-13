package models

import (
	"time"

	"gorm.io/datatypes"
)

// ThemeLibrary stores a renderable visual/layout preset.
type ThemeLibrary struct {
	ID              UUID            `json:"id" gorm:"type:uuid;primaryKey"`
	Name            string          `json:"name" gorm:"size:128;not null"`
	LayoutID        string          `json:"layout_id" gorm:"size:32;not null;index"`
	CategoryEntries []ThemeCategory `json:"-" gorm:"many2many:theme_category_relation;foreignKey:ID;joinForeignKey:ThemeID;references:ID;joinReferences:CategoryID"`
	CategoryIDs     []UUID          `json:"category_ids" gorm:"-"`
	Categories      []string        `json:"categories" gorm:"-"`
	Highlights      datatypes.JSON  `json:"highlights"`
	PreviewColors   datatypes.JSON  `json:"preview_colors"`
	SortOrder       int             `json:"sort_order" gorm:"default:0"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

func (ThemeLibrary) TableName() string { return "theme_library" }

// TemplateLibrary stores a resume-content snapshot for an industry/position.
type TemplateLibrary struct {
	ID              UUID               `json:"id" gorm:"type:uuid;primaryKey"`
	Name            string             `json:"name" gorm:"size:128;not null"`
	Industry        string             `json:"industry" gorm:"size:64;not null;default:'通用';index"`
	CategoryEntries []TemplateCategory `json:"-" gorm:"many2many:template_category_relation;foreignKey:ID;joinForeignKey:TemplateID;references:ID;joinReferences:CategoryID"`
	CategoryIDs     []UUID             `json:"category_ids" gorm:"-"`
	Categories      []string           `json:"categories" gorm:"-"`
	Highlights      datatypes.JSON     `json:"highlights" gorm:"not null"`
	Content         datatypes.JSON     `json:"content" gorm:"not null"`
	DefaultThemeID  UUID               `json:"default_theme_id" gorm:"type:uuid;not null;index"`
	DefaultTheme    *ThemeLibrary      `json:"default_theme,omitempty" gorm:"foreignKey:DefaultThemeID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
	Status          string             `json:"status" gorm:"size:16;not null;default:'published';index"`
	SortOrder       int                `json:"sort_order" gorm:"default:0"`
	CreatedAt       time.Time          `json:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at"`
}

func (TemplateLibrary) TableName() string { return "template_library" }

// TemplateCategory is a managed classification for resume content templates.
type TemplateCategory struct {
	ID        UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	Name      string    `json:"name" gorm:"size:64;not null;uniqueIndex"`
	Code      string    `json:"code" gorm:"size:64;not null;uniqueIndex"`
	Status    string    `json:"status" gorm:"size:16;not null;default:'enabled';index"`
	SortOrder int       `json:"sort_order" gorm:"not null;default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (TemplateCategory) TableName() string { return "template_category" }

// ThemeCategory is a managed visual-style or feature classification.
// Structural layout properties remain represented by ThemeLibrary.LayoutID.
type ThemeCategory struct {
	ID        UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	Name      string    `json:"name" gorm:"size:64;not null;uniqueIndex"`
	Code      string    `json:"code" gorm:"size:64;not null;uniqueIndex"`
	Type      string    `json:"type" gorm:"size:16;not null;default:'style';index"`
	Status    string    `json:"status" gorm:"size:16;not null;default:'enabled';index"`
	SortOrder int       `json:"sort_order" gorm:"not null;default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (ThemeCategory) TableName() string { return "theme_category" }

type TemplateCategoryRelation struct {
	TemplateID UUID             `json:"template_id" gorm:"type:uuid;primaryKey"`
	CategoryID UUID             `json:"category_id" gorm:"type:uuid;primaryKey"`
	SortOrder  int              `json:"sort_order" gorm:"not null;default:0"`
	Template   TemplateLibrary  `json:"-" gorm:"foreignKey:TemplateID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Category   TemplateCategory `json:"-" gorm:"foreignKey:CategoryID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

func (TemplateCategoryRelation) TableName() string { return "template_category_relation" }

type ThemeCategoryRelation struct {
	ThemeID    UUID          `json:"theme_id" gorm:"type:uuid;primaryKey"`
	CategoryID UUID          `json:"category_id" gorm:"type:uuid;primaryKey"`
	SortOrder  int           `json:"sort_order" gorm:"not null;default:0"`
	Theme      ThemeLibrary  `json:"-" gorm:"foreignKey:ThemeID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Category   ThemeCategory `json:"-" gorm:"foreignKey:CategoryID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

func (ThemeCategoryRelation) TableName() string { return "theme_category_relation" }

func (entry *TemplateLibrary) HydrateCategories() {
	entry.CategoryIDs = make([]UUID, 0, len(entry.CategoryEntries))
	entry.Categories = make([]string, 0, len(entry.CategoryEntries))
	for _, category := range entry.CategoryEntries {
		entry.CategoryIDs = append(entry.CategoryIDs, category.ID)
		entry.Categories = append(entry.Categories, category.Name)
	}
}

func (entry *ThemeLibrary) HydrateCategories() {
	entry.CategoryIDs = make([]UUID, 0, len(entry.CategoryEntries))
	entry.Categories = make([]string, 0, len(entry.CategoryEntries))
	for _, category := range entry.CategoryEntries {
		entry.CategoryIDs = append(entry.CategoryIDs, category.ID)
		entry.Categories = append(entry.Categories, category.Name)
	}
}
