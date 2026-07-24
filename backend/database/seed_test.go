package database

import (
	"encoding/json"
	"testing"

	"gorm.io/datatypes"
)

func TestReplaceDemoAvatarURL(t *testing.T) {
	input := datatypes.JSON(`{
		"personalInfo": {
			"fullName": "布丁",
			"photoUrl": "/api/avatars/demo-avatar.jpg"
		},
		"custom": {"preserved": true}
	}`)

	updated, changed, err := replaceDemoAvatarURL(input)
	if err != nil {
		t.Fatalf("replaceDemoAvatarURL returned an error: %v", err)
	}
	if !changed {
		t.Fatal("replaceDemoAvatarURL did not report a change")
	}

	var document map[string]any
	if err := json.Unmarshal(updated, &document); err != nil {
		t.Fatalf("updated content is invalid JSON: %v", err)
	}
	personalInfo := document["personalInfo"].(map[string]any)
	if got := personalInfo["photoUrl"]; got != demoAvatarURL {
		t.Fatalf("photoUrl = %v, want %q", got, demoAvatarURL)
	}
	custom := document["custom"].(map[string]any)
	if got := custom["preserved"]; got != true {
		t.Fatalf("unrelated content was not preserved: %v", got)
	}
}

func TestReplaceDemoAvatarURLMigratesPreviousFrontendName(t *testing.T) {
	input := datatypes.JSON(`{"personalInfo":{"photoUrl":"/images/demo-avatar.jpg"}}`)

	updated, changed, err := replaceDemoAvatarURL(input)
	if err != nil {
		t.Fatalf("replaceDemoAvatarURL returned an error: %v", err)
	}
	if !changed {
		t.Fatal("replaceDemoAvatarURL did not report a change")
	}

	var document map[string]any
	if err := json.Unmarshal(updated, &document); err != nil {
		t.Fatalf("updated content is invalid JSON: %v", err)
	}
	personalInfo := document["personalInfo"].(map[string]any)
	if got := personalInfo["photoUrl"]; got != demoAvatarURL {
		t.Fatalf("photoUrl = %v, want %q", got, demoAvatarURL)
	}
}

func TestReplaceDemoAvatarURLLeavesOtherPhotosUntouched(t *testing.T) {
	input := datatypes.JSON(`{"personalInfo":{"photoUrl":"/api/avatars/user-avatar.jpg"}}`)

	updated, changed, err := replaceDemoAvatarURL(input)
	if err != nil {
		t.Fatalf("replaceDemoAvatarURL returned an error: %v", err)
	}
	if changed {
		t.Fatal("replaceDemoAvatarURL changed a non-demo avatar")
	}
	if string(updated) != string(input) {
		t.Fatalf("content changed unexpectedly: %s", updated)
	}
}
