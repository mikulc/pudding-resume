package handlers

import (
	"encoding/json"
	"testing"
)

func TestBuildTemplateNormalizesInput(t *testing.T) {
	entry, err := buildTemplate(adminTemplateInput{
		Name:       "  Go 后端工程师  ",
		Categories: []string{"Go", " Go ", ""},
		Content:    json.RawMessage(`{"personalInfo":{},"education":[],"workExperience":[],"projects":[],"skills":""}`),
		LayoutID:   " skyveil ", Status: "draft", SortOrder: 2,
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
		{Name: "模板", Categories: []string{" "}, Content: json.RawMessage(`{}`), LayoutID: "skyveil"},
		{Name: "模板", Categories: []string{"通用"}, Content: json.RawMessage(`[]`), LayoutID: "skyveil"},
		{Name: "模板", Categories: []string{"通用"}, Content: json.RawMessage(`{"personalInfo":{},"education":[],"workExperience":[],"projects":[],"skills":""}`)},
	}
	for _, input := range tests {
		if _, err := buildTemplate(input); err == nil {
			t.Fatalf("buildTemplate(%#v) expected error", input)
		}
	}
}

func TestBuildTemplateAcceptsLegacyDefaultThemeID(t *testing.T) {
	_, err := buildTemplate(adminTemplateInput{
		Name:           "兼容旧模板",
		Categories:     []string{"通用"},
		Content:        json.RawMessage(`{"personalInfo":{},"education":[],"workExperience":[],"projects":[],"skills":""}`),
		DefaultThemeID: "legacy-theme-id",
	})
	if err != nil {
		t.Fatalf("buildTemplate() rejected legacy default_theme_id: %v", err)
	}
}
