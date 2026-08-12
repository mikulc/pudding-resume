package handlers

import (
	"fmt"
	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
	"time"

	"gorm.io/gorm/clause"
)

func dailyStatsIncrementExpression(field string, increment int64) clause.Expr {
	return clause.Expr{
		SQL: "? + ?",
		Vars: []any{
			clause.Column{Table: clause.CurrentTable, Name: field},
			increment,
		},
	}
}

func UpsertDailyStats(userID string, field string, increment int64) {
	today := time.Now().Format("2006-01-02")

	entry := models.UserDailyStats{
		UserID: models.UUID(userID),
		Date:   today,
	}
	switch field {
	case "resumes_created":
		entry.ResumesCreated = int(increment)
	case "exports_count":
		entry.ExportsCount = int(increment)
	case "editing_seconds":
		entry.EditingSeconds = increment
	default:
		fmt.Printf("UpsertDailyStats: unknown field %s\n", field)
		return
	}

	err := database.DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}, {Name: "date"}},
		DoUpdates: clause.Assignments(map[string]any{
			field: dailyStatsIncrementExpression(field, increment),
		}),
	}).Create(&entry).Error
	if err != nil {
		fmt.Printf("UpsertDailyStats: %v\n", err)
	}
}
