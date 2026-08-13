package handlers

import (
	"encoding/json"
	"testing"
)

func TestBuildTemplateNormalizesInput(t *testing.T) {
	entry, err := buildTemplate(adminTemplateInput{
		Name: "  Go 后端工程师  ", Industry: " 互联网 ",
		Categories: []string{"Go", " Go ", ""}, Highlights: []string{},
		Content:        json.RawMessage(`{"personalInfo":{},"education":[],"workExperience":[],"projects":[],"skills":""}`),
		DefaultThemeID: "theme-id", Status: "draft", SortOrder: 2,
	})
	if err != nil {
		t.Fatalf("buildTemplate() error = %v", err)
	}
	if entry.Name != "Go 后端工程师" || entry.Industry != "互联网" {
		t.Fatalf("text fields were not trimmed: %#v", entry)
	}
	if string(entry.Categories) != `["Go"]` {
		t.Fatalf("categories = %s, want deduplicated list", entry.Categories)
	}
}

func TestBuildTemplateRejectsInvalidContentAndBlankCategories(t *testing.T) {
	tests := []adminTemplateInput{
		{Name: "模板", Industry: "通用", Categories: []string{" "}, Content: json.RawMessage(`{}`), DefaultThemeID: "theme-id"},
		{Name: "模板", Industry: "通用", Categories: []string{"通用"}, Content: json.RawMessage(`[]`), DefaultThemeID: "theme-id"},
	}
	for _, input := range tests {
		if _, err := buildTemplate(input); err == nil {
			t.Fatalf("buildTemplate(%#v) expected error", input)
		}
	}
}
