package handlers

import (
	"encoding/json"
	"testing"
)

func TestRedactResumeContentMasksPersonalInfo(t *testing.T) {
	source := []byte(`{
		"personalInfo": {
			"fullName": "布丁",
			"phone": "13888888888",
			"email": "pudding@example.com",
			"photoUrl": "/api/avatars/demo-avatar.jpg",
			"location": "Shenzhen",
			"jobTarget": "Golang Developer",
			"customFields": {
				"WeChat": "pudding123"
			}
		},
		"skills": "Go, React"
	}`)

	var result map[string]any
	if err := json.Unmarshal(redactResumeContent(source), &result); err != nil {
		t.Fatalf("redacted content should be valid JSON: %v", err)
	}

	personalInfo := result["personalInfo"].(map[string]any)
	if personalInfo["fullName"] != "布*" {
		t.Fatalf("expected masked fullName, got %q", personalInfo["fullName"])
	}
	if personalInfo["phone"] != "138******88" {
		t.Fatalf("expected masked phone, got %q", personalInfo["phone"])
	}
	if personalInfo["email"] != "p***@***" {
		t.Fatalf("expected masked email, got %q", personalInfo["email"])
	}
	if personalInfo["photoUrl"] != "" {
		t.Fatalf("expected empty photoUrl, got %q", personalInfo["photoUrl"])
	}
	if personalInfo["jobTarget"] != "Golang Developer" {
		t.Fatalf("expected non-sensitive field to remain unchanged, got %q", personalInfo["jobTarget"])
	}
}

func TestMaskPhoneHandlesShortNumbers(t *testing.T) {
	if got := maskPhone("12345"); got != "1****" {
		t.Fatalf("expected short phone to be masked, got %q", got)
	}
}
