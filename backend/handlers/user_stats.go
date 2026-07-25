package handlers

import (
	"fmt"
	"pudding-resume-backend/database"
	"time"
)

func UpsertDailyStats(userID string, field string, increment int64) {
	today := time.Now().Format("2006-01-02")

	// Upsert: insert a new row or update the existing one for today
	switch field {
	case "resumes_created":
		database.DB.Exec(`
			INSERT INTO user_daily_stats (user_id, date, resumes_created, exports_count, editing_seconds)
			VALUES (?, ?, 1, 0, 0)
			ON CONFLICT (user_id, date) DO UPDATE SET resumes_created = user_daily_stats.resumes_created + 1
		`, userID, today)
	case "exports_count":
		database.DB.Exec(`
			INSERT INTO user_daily_stats (user_id, date, resumes_created, exports_count, editing_seconds)
			VALUES (?, ?, 0, 1, 0)
			ON CONFLICT (user_id, date) DO UPDATE SET exports_count = user_daily_stats.exports_count + 1
		`, userID, today)
	case "editing_seconds":
		database.DB.Exec(`
			INSERT INTO user_daily_stats (user_id, date, resumes_created, exports_count, editing_seconds)
			VALUES (?, ?, 0, 0, ?)
			ON CONFLICT (user_id, date) DO UPDATE SET editing_seconds = user_daily_stats.editing_seconds + ?
		`, userID, today, increment, increment)
	default:
		fmt.Printf("UpsertDailyStats: unknown field %s\n", field)
	}
}
