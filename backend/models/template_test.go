package models

import "testing"

func TestLibraryTableNames(t *testing.T) {
	if got := (ThemeLibrary{}).TableName(); got != "theme_library" {
		t.Fatalf("ThemeLibrary table = %q, want theme_library", got)
	}
	if got := (TemplateLibrary{}).TableName(); got != "template_library" {
		t.Fatalf("TemplateLibrary table = %q, want template_library", got)
	}
}
