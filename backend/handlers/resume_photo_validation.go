package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
)

// maxResumePhotoBytes is the maximum decoded size (in bytes) for a base64 resume photo.
const maxResumePhotoBytes = 2 * 1024 * 1024 // 2 MB

// validateResumePhotoURL checks the content JSON for an oversized base64 photoUrl.
// Returns an error message string if invalid, or empty string if valid.
func validateResumePhotoURL(content json.RawMessage) string {
	if len(content) == 0 {
		return ""
	}

	var parsed struct {
		PersonalInfo *struct {
			PhotoURL string `json:"photoUrl"`
		} `json:"personalInfo"`
	}
	if err := json.Unmarshal(content, &parsed); err != nil || parsed.PersonalInfo == nil {
		return ""
	}
	photoURL := parsed.PersonalInfo.PhotoURL
	if photoURL == "" {
		return ""
	}

	// Only validate base64 data URLs
	const prefix = "data:image/"
	if !strings.HasPrefix(photoURL, prefix) {
		return ""
	}

	// Find the base64 payload after ";base64,"
	commaIdx := strings.Index(photoURL, ",")
	if commaIdx == -1 {
		return "简历照片格式错误"
	}
	encoded := photoURL[commaIdx+1:]

	// Decode and check size
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		decoded, err = base64.URLEncoding.DecodeString(encoded)
		if err != nil {
			return "简历照片格式错误，无法解析"
		}
	}
	if len(decoded) > maxResumePhotoBytes {
		return fmt.Sprintf("简历照片过大，最大允许 %dMB", maxResumePhotoBytes/(1024*1024))
	}

	return ""
}
