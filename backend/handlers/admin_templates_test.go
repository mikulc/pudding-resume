package handlers

import (
	"encoding/json"
	"testing"
)

func TestBuildTemplateNormalizesInput(t *testing.T) {
	entry, err := buildTemplate(adminTemplateInput{
		Name:           "  Go 后端工程师  ",
		Categories:     []string{"Go", " Go ", ""},
		Content:        json.RawMessage(`{"personalInfo":{},"education":[],"workExperience":[],"projects":[],"skills":""}`),
		DefaultThemeID: "theme-id", Status: "draft", SortOrder: 2,
	})
	if err != nil {
		t.Fatalf("buildTemplate() error = %v", err)
	}
	if entry.Name != "Go 后端工程师" {
		t.Fatalf("template name was not trimmed: %#v", entry)
	}
	if got := cleanStringList([]string{"Go", " Go ", ""}); len(got) != 1 || got[0] != "Go" {
		t.Fatalf("cleanStringList() = %#v, want [Go]", got)
	}
}

func TestBuildTemplateRejectsInvalidContentAndBlankCategories(t *testing.T) {
	tests := []adminTemplateInput{
		{Name: "模板", Categories: []string{" "}, Content: json.RawMessage(`{}`), DefaultThemeID: "theme-id"},
		{Name: "模板", Categories: []string{"通用"}, Content: json.RawMessage(`[]`), DefaultThemeID: "theme-id"},
	}
	for _, input := range tests {
		if _, err := buildTemplate(input); err == nil {
			t.Fatalf("buildTemplate(%#v) expected error", input)
		}
	}
}
