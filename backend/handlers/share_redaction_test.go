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
			"photoUrl": "/images/avatar.jpg",
			"preferredLocation": "Shenzhen",
			"targetRole": "Golang Developer",
			"customFields": [{
				"id": "custom-wechat",
				"label": "WeChat",
				"value": "pudding123"
			}]
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
	if personalInfo["targetRole"] != "Golang Developer" {
		t.Fatalf("expected non-sensitive field to remain unchanged, got %q", personalInfo["targetRole"])
	}
	if personalInfo["preferredLocation"] != "S******n" {
		t.Fatalf("expected preferredLocation to be masked, got %q", personalInfo["preferredLocation"])
	}
	customFields := personalInfo["customFields"].([]any)
	customField := customFields[0].(map[string]any)
	if customField["value"] != "p********3" {
		t.Fatalf("expected custom field value to be masked, got %q", customField["value"])
	}
}

func TestRedactResumeContentSupportsLegacyPersonalInfo(t *testing.T) {
	source := []byte(`{"personalInfo":{"location":"Shenzhen","customFields":{"WeChat":"pudding123"}}}`)

	var result map[string]any
	if err := json.Unmarshal(redactResumeContent(source), &result); err != nil {
		t.Fatalf("redacted content should be valid JSON: %v", err)
	}
	personalInfo := result["personalInfo"].(map[string]any)
	if personalInfo["location"] != "S******n" {
		t.Fatalf("expected legacy location to be masked, got %q", personalInfo["location"])
	}
	customFields := personalInfo["customFields"].(map[string]any)
	if customFields["WeChat"] != "p********3" {
		t.Fatalf("expected legacy custom field to be masked, got %q", customFields["WeChat"])
	}
}

func TestMaskPhoneHandlesShortNumbers(t *testing.T) {
	if got := maskPhone("12345"); got != "1****" {
		t.Fatalf("expected short phone to be masked, got %q", got)
	}
}
