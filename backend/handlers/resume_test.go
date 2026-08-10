package handlers

import (
	"strings"
	"testing"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func TestResumeListOrderingQueryOnlySortsIDs(t *testing.T) {
	db, err := gorm.Open(mysql.New(mysql.Config{
		DSN:                       "resume:password@tcp(localhost:3306)/pudding_resume?parseTime=true",
		SkipInitializeWithVersion: true,
	}), &gorm.Config{DisableAutomaticPing: true, SkipDefaultTransaction: true, DryRun: true})
	if err != nil {
		t.Fatalf("open dry-run database: %v", err)
	}

	var rows []resumeListID
	result := buildResumeListIDQuery(db, "USER_ID", 8, 0).Find(&rows)
	if result.Error != nil {
		t.Fatalf("build list query: %v", result.Error)
	}

	sql := strings.ToLower(result.Statement.SQL.String())
	if !strings.Contains(sql, "select `id` from `user_resumes`") {
		t.Fatalf("list ordering query selects more than IDs: %s", sql)
	}
	if strings.Contains(sql, "content") || strings.Contains(sql, "settings") {
		t.Fatalf("list ordering query sorts JSON columns: %s", sql)
	}
	if !strings.Contains(sql, "order by updated_at desc,id desc") {
		t.Fatalf("list ordering is not deterministic: %s", sql)
	}
}
