package models

import (
	"sync"
	"testing"

	"gorm.io/gorm/schema"
)

func TestLibraryTableNames(t *testing.T) {
	if got := (ThemeLibrary{}).TableName(); got != "theme_library" {
		t.Fatalf("ThemeLibrary table = %q, want theme_library", got)
	}
	if got := (TemplateLibrary{}).TableName(); got != "template_library" {
		t.Fatalf("TemplateLibrary table = %q, want template_library", got)
	}
	if got := (ThemeCategory{}).TableName(); got != "theme_category" {
		t.Fatalf("ThemeCategory table = %q, want theme_category", got)
	}
	if got := (TemplateCategory{}).TableName(); got != "template_category" {
		t.Fatalf("TemplateCategory table = %q, want template_category", got)
	}
}

func TestLibraryCategoryJoinColumns(t *testing.T) {
	tests := []struct {
		model      any
		ownerField string
	}{
		{model: &ThemeLibrary{}, ownerField: "theme_id"},
		{model: &TemplateLibrary{}, ownerField: "template_id"},
	}
	for _, test := range tests {
		parsed, err := schema.Parse(test.model, &sync.Map{}, schema.NamingStrategy{})
		if err != nil {
			t.Fatalf("parse schema: %v", err)
		}
		relation := parsed.Relationships.Relations["CategoryEntries"]
		if relation == nil || relation.JoinTable == nil {
			t.Fatal("CategoryEntries many-to-many relationship is missing")
		}
		if relation.JoinTable.LookUpField(test.ownerField) == nil {
			t.Fatalf("join table is missing %s", test.ownerField)
		}
		if relation.JoinTable.LookUpField("category_id") == nil {
			t.Fatal("join table is missing category_id")
		}
	}
}

func TestThemeLayoutIDHasUniqueIndex(t *testing.T) {
	parsed, err := schema.Parse(&ThemeLibrary{}, &sync.Map{}, schema.NamingStrategy{})
	if err != nil {
		t.Fatalf("parse schema: %v", err)
	}
	for _, index := range parsed.ParseIndexes() {
		if index.Name == "ux_theme_library_layout_id" && index.Class == "UNIQUE" {
			return
		}
	}
	t.Fatal("theme_library.layout_id unique index is missing")
}
