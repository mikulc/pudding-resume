package handlers

import (
	"encoding/base64"
	"encoding/json"
	"strings"
	"testing"
)

func resumeContentWithPhotoSize(size int) json.RawMessage {
	photo := "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(make([]byte, size))
	content, _ := json.Marshal(map[string]any{
		"personalInfo": map[string]string{"photoUrl": photo},
	})
	return content
}

func TestValidateResumePhotoURLAllowsTwoMegabytes(t *testing.T) {
	if got := validateResumePhotoURL(resumeContentWithPhotoSize(2 * 1024 * 1024)); got != "" {
		t.Fatalf("expected a 2MB photo to be accepted, got %q", got)
	}
}

func TestValidateResumePhotoURLRejectsMoreThanTwoMegabytes(t *testing.T) {
	got := validateResumePhotoURL(resumeContentWithPhotoSize(2*1024*1024 + 1))
	if !strings.Contains(got, "2MB") {
		t.Fatalf("expected a photo over 2MB to be rejected with the 2MB limit, got %q", got)
	}
}
