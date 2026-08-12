package handlers

import (
	"strings"
	"testing"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"pudding-resume-backend/models"
)

func TestDateOnlyExpressionUsesDatabaseDialect(t *testing.T) {
	mysqlExpression := dateOnlyExpression("mysql", "created_at")
	if !strings.Contains(mysqlExpression, "DATE_FORMAT") || strings.Contains(mysqlExpression, "TO_CHAR") {
		t.Fatalf("unexpected MySQL date expression: %s", mysqlExpression)
	}

	postgresExpression := dateOnlyExpression("postgres", "created_at")
	if !strings.Contains(postgresExpression, "TO_CHAR") || strings.Contains(postgresExpression, "DATE_FORMAT") {
		t.Fatalf("unexpected PostgreSQL date expression: %s", postgresExpression)
	}
}

func TestAIUsageSelectsAvoidMySQLReservedKeyAlias(t *testing.T) {
	selectSQL := strings.ToLower(providerUsageSelectSQL)
	if strings.Contains(selectSQL, " as key") {
		t.Fatalf("provider query uses reserved MySQL alias key: %s", providerUsageSelectSQL)
	}
	if !strings.Contains(selectSQL, "provider as provider_key") {
		t.Fatalf("provider query is missing the portable alias: %s", providerUsageSelectSQL)
	}
}

func TestDailyTrendSelectUsesMySQLDateFunction(t *testing.T) {
	selectSQL := dailyTrendSelectSQL("mysql")
	if strings.Contains(selectSQL, "TO_CHAR") || !strings.Contains(selectSQL, "DATE_FORMAT") {
		t.Fatalf("unexpected MySQL daily trend query: %s", selectSQL)
	}
}

func TestDailyStatsIncrementExpressionQuotesQualifiedColumnForEachDialect(t *testing.T) {
	tests := []struct {
		name       string
		dialector  gorm.Dialector
		wantColumn string
	}{
		{
			name: "mysql",
			dialector: mysql.New(mysql.Config{
				DSN:                       "gorm:gorm@tcp(localhost:9910)/gorm?charset=utf8&parseTime=True&loc=Local",
				SkipInitializeWithVersion: true,
			}),
			wantColumn: "`user_daily_stats`.`resumes_created` + 1",
		},
		{
			name:       "postgres",
			dialector:  postgres.Open("host=localhost user=gorm password=gorm dbname=gorm port=9920 sslmode=disable"),
			wantColumn: `"user_daily_stats"."resumes_created" + 1`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, err := gorm.Open(tt.dialector, &gorm.Config{
				DryRun:               true,
				DisableAutomaticPing: true,
			})
			if err != nil {
				t.Fatalf("open dry-run database: %v", err)
			}

			sql := db.ToSQL(func(tx *gorm.DB) *gorm.DB {
				return tx.Clauses(clause.OnConflict{
					Columns: []clause.Column{{Name: "user_id"}, {Name: "date"}},
					DoUpdates: clause.Assignments(map[string]any{
						"resumes_created": dailyStatsIncrementExpression("resumes_created", 1),
					}),
				}).Create(&models.UserDailyStats{
					UserID:         models.UUID("00000000-0000-0000-0000-000000000001"),
					Date:           "2026-08-12",
					ResumesCreated: 1,
				})
			})

			if !strings.Contains(sql, tt.wantColumn) {
				t.Fatalf("increment column is not qualified for %s: %s", tt.name, sql)
			}
		})
	}
}
