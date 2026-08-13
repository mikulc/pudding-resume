package handlers

import "testing"

func TestNormalizeTemplateCategoryInput(t *testing.T) {
	input, err := normalizeTemplateCategoryInput(adminCategoryInput{Name: " Go "})
	if err != nil {
		t.Fatalf("normalizeTemplateCategoryInput() error = %v", err)
	}
	if input.Name != "Go" || input.Status != "enabled" {
		t.Fatalf("normalizeTemplateCategoryInput() = %#v", input)
	}
}
