package database

import "testing"

func TestBuiltInTemplateCategories(t *testing.T) {
	categories := builtInTemplateCategories()
	wantNames := []string{
		"互联网通用", "前端开发", "后端开发", "Golang", "Java",
		"C++", "校招", "实习", "社招",
	}
	if len(categories) != len(wantNames) {
		t.Fatalf("category count = %d, want %d", len(categories), len(wantNames))
	}
	seenNames := make(map[string]struct{}, len(categories))
	seenCodes := make(map[string]struct{}, len(categories))
	for index, category := range categories {
		if category.Name != wantNames[index] {
			t.Fatalf("category %d name = %q, want %q", index, category.Name, wantNames[index])
		}
		if category.Status != "enabled" {
			t.Fatalf("category %q status = %q, want enabled", category.Name, category.Status)
		}
		if category.SortOrder != index+1 {
			t.Fatalf("category %q sort order = %d, want %d", category.Name, category.SortOrder, index+1)
		}
		if category.Code == "" {
			t.Fatalf("category %q has an empty code", category.Name)
		}
		if _, exists := seenNames[category.Name]; exists {
			t.Fatalf("duplicate category name %q", category.Name)
		}
		if _, exists := seenCodes[category.Code]; exists {
			t.Fatalf("duplicate category code %q", category.Code)
		}
		seenNames[category.Name] = struct{}{}
		seenCodes[category.Code] = struct{}{}
	}
}
