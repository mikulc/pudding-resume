package handlers

import (
	"gorm.io/gorm"
	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
	"time"
)

// countResumes returns the number of resumes belonging to the given user.
func countResumes(userID string) (int64, error) {
	var count int64
	err := database.DB.Model(&models.Resume{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

// getUserMaxResumes fetches the user's MaxResumes limit from user_quota, falls back to 10 if not set.
func getUserMaxResumes(userID string) int {
	var quota models.UserQuota
	if err := database.DB.Where("user_id = ?", userID).First(&quota).Error; err != nil {
		return 10
	}
	if quota.MaxResumes <= 0 {
		return 10
	}
	return quota.MaxResumes
}

// incrementResumeStats increments the user's total_resumes_created in user_stats.
func incrementResumeStats(userID string) {
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("total_resumes_created", gorm.Expr("total_resumes_created + 1"))
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("last_active_at", time.Now())
	// Also track daily stats
	UpsertDailyStats(userID, "resumes_created", 1)
}

// incrementEditingTime increments the user's total_editing_seconds in user_stats.
func incrementEditingTime(userID string, seconds int64) {
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("total_editing_seconds", gorm.Expr("total_editing_seconds + ?", seconds))
	database.DB.Model(&models.UserStats{}).
		Where("user_id = ?", userID).
		UpdateColumn("last_active_at", time.Now())
	// Also track daily stats
	UpsertDailyStats(userID, "editing_seconds", seconds)
}
