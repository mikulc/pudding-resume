package database

import (
	"encoding/json"
	"log"

	"gorm.io/datatypes"

	"pudding-resume-backend/models"
)

const (
	legacyBackendDemoAvatarURL  = "/api/avatars/demo-avatar.jpg"
	legacyFrontendDemoAvatarURL = "/images/demo-avatar.jpg"
	demoAvatarURL               = "/images/avatar.jpg"
)

// migrateBundledAvatarURLs updates references to the relocated bundled avatar
// without replacing any other content in user-created resumes.
func migrateBundledAvatarURLs() {
	var resumes []models.Resume
	if err := DB.Find(&resumes).Error; err != nil {
		log.Printf("Warning: failed to load resumes for asset migration: %v", err)
		return
	}

	updatedResumes := 0
	for _, resume := range resumes {
		content, changed, err := replaceDemoAvatarURL(resume.Content)
		if err != nil {
			log.Printf("Warning: failed to migrate resume %s: %v", resume.ID, err)
			continue
		}
		if !changed {
			continue
		}
		if err := DB.Model(&models.Resume{}).
			Where("id = ?", resume.ID).
			UpdateColumn("content", content).Error; err != nil {
			log.Printf("Warning: failed to update resume %s: %v", resume.ID, err)
			continue
		}
		updatedResumes++
	}
	if updatedResumes > 0 {
		log.Printf("Resume asset paths migrated: %d row(s) updated", updatedResumes)
	}
}

func replaceDemoAvatarURL(content datatypes.JSON) (datatypes.JSON, bool, error) {
	var document map[string]any
	if err := json.Unmarshal(content, &document); err != nil {
		return nil, false, err
	}

	personalInfo, ok := document["personalInfo"].(map[string]any)
	if !ok {
		return content, false, nil
	}

	photoURL, _ := personalInfo["photoUrl"].(string)
	if photoURL != legacyBackendDemoAvatarURL && photoURL != legacyFrontendDemoAvatarURL {
		return content, false, nil
	}

	personalInfo["photoUrl"] = demoAvatarURL
	updated, err := json.Marshal(document)
	if err != nil {
		return nil, false, err
	}
	return datatypes.JSON(updated), true, nil
}
