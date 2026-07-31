package database

import (
	"encoding/json"
	"testing"
)

func TestTemplateContentForJobTargetCreatesIndependentSnapshot(t *testing.T) {
	content := templateContentForJobTarget("前端开发工程师")

	var document map[string]any
	if err := json.Unmarshal(content, &document); err != nil {
		t.Fatalf("template content is invalid JSON: %v", err)
	}
	personalInfo, ok := document["personalInfo"].(map[string]any)
	if !ok {
		t.Fatal("template content has no personalInfo object")
	}
	if got := personalInfo["jobTarget"]; got != "前端开发工程师" {
		t.Fatalf("jobTarget = %v, want 前端开发工程师", got)
	}

	var original map[string]any
	if err := json.Unmarshal(DefaultDemoContentJSON(), &original); err != nil {
		t.Fatalf("default demo content is invalid JSON: %v", err)
	}
	originalPersonalInfo := original["personalInfo"].(map[string]any)
	if originalPersonalInfo["jobTarget"] == "前端开发工程师" {
		t.Fatal("template snapshot mutated the shared demo content")
	}
}
