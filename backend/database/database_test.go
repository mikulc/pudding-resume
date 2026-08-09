package database

import (
	"strings"
	"testing"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"pudding-resume-backend/models"
)

func TestActiveUserEmailIndexMigrationAllowsDuplicateUsernames(t *testing.T) {
	statements := strings.Join(activeUserEmailIndexMigrationStatements(), "\n")

	for _, indexName := range []string{
		"idx_user_info_username",
		"idx_user_info_username_active",
	} {
		if !strings.Contains(statements, "DROP INDEX IF EXISTS "+indexName) {
			t.Fatalf("migration does not remove username index %q", indexName)
		}
	}

	if strings.Contains(statements, "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_info_username") {
		t.Fatal("migration recreates a unique username index")
	}
	if !strings.Contains(statements, "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_info_email_active") {
		t.Fatal("migration does not preserve active-email uniqueness")
	}
}

func TestDatabaseDialector(t *testing.T) {
	for _, driver := range []string{"postgres", "mysql"} {
		dialector, err := databaseDialector(driver, "ignored")
		if err != nil {
			t.Fatalf("databaseDialector(%q): %v", driver, err)
		}
		if dialector.Name() != driver {
			t.Fatalf("databaseDialector(%q).Name() = %q", driver, dialector.Name())
		}
	}
	if _, err := databaseDialector("sqlite", "ignored"); err == nil {
		t.Fatal("unknown driver should fail")
	}
}

func TestUUIDCreateCallbackAssignsID(t *testing.T) {
	db, err := gorm.Open(mysql.New(mysql.Config{
		DSN:                       "resume:password@tcp(localhost:3306)/pudding_resume?parseTime=true",
		SkipInitializeWithVersion: true,
	}), &gorm.Config{DisableAutomaticPing: true, SkipDefaultTransaction: true, DryRun: true})
	if err != nil {
		t.Fatalf("open dry-run database: %v", err)
	}
	registerUUIDCreateCallback(db)

	user := models.User{Username: "tester", Email: "tester@example.com", Password: "hash"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("dry-run create: %v", err)
	}
	if user.ID == "" {
		t.Fatal("UUID callback did not assign an ID")
	}
}

func TestMySQLUserStatsCreateDoesNotWriteZeroDate(t *testing.T) {
	db, err := gorm.Open(mysql.New(mysql.Config{
		DSN:                       "resume:password@tcp(localhost:3306)/pudding_resume?parseTime=true",
		SkipInitializeWithVersion: true,
	}), &gorm.Config{DisableAutomaticPing: true, SkipDefaultTransaction: true, DryRun: true})
	if err != nil {
		t.Fatalf("open dry-run database: %v", err)
	}
	registerUUIDCreateCallback(db)

	stats := models.UserStats{UserID: models.NewUUID()}
	result := db.Create(&stats)
	if result.Error != nil {
		t.Fatalf("dry-run create: %v", result.Error)
	}
	if stats.LastActiveAt.IsZero() {
		t.Fatal("LastActiveAt remained zero during create")
	}
	if sql := result.Statement.SQL.String(); strings.Contains(sql, "0000-00-00") {
		t.Fatalf("create writes a MySQL zero date: %s", sql)
	}
}

func TestMySQLMigrationDataTypes(t *testing.T) {
	db, err := gorm.Open(mysql.New(mysql.Config{
		DSN:                       "resume:password@tcp(localhost:3306)/pudding_resume?parseTime=true",
		SkipInitializeWithVersion: true,
	}), &gorm.Config{DisableAutomaticPing: true, SkipDefaultTransaction: true, DryRun: true})
	if err != nil {
		t.Fatalf("open dry-run database: %v", err)
	}

	statement := &gorm.Statement{DB: db}
	if err := statement.Parse(&models.Resume{}); err != nil {
		t.Fatalf("parse Resume schema: %v", err)
	}
	for fieldName, expected := range map[string]string{"ID": "char(36)", "Content": "JSON"} {
		field := statement.Schema.LookUpField(fieldName)
		if field == nil {
			t.Fatalf("missing field %s", fieldName)
		}
		if got := db.Migrator().FullDataTypeOf(field).SQL; !strings.HasPrefix(strings.ToLower(got), strings.ToLower(expected)) {
			t.Fatalf("MySQL %s type = %q, want %q", fieldName, got, expected)
		}
	}
}

func TestPostgresMigrationDataTypes(t *testing.T) {
	db, err := gorm.Open(postgres.Open("host=localhost user=resume dbname=pudding_resume sslmode=disable"),
		&gorm.Config{DisableAutomaticPing: true, SkipDefaultTransaction: true, DryRun: true})
	if err != nil {
		t.Fatalf("open dry-run database: %v", err)
	}

	statement := &gorm.Statement{DB: db}
	if err := statement.Parse(&models.Resume{}); err != nil {
		t.Fatalf("parse Resume schema: %v", err)
	}
	for fieldName, expected := range map[string]string{"ID": "uuid", "Content": "JSONB"} {
		field := statement.Schema.LookUpField(fieldName)
		if field == nil {
			t.Fatalf("missing field %s", fieldName)
		}
		if got := db.Migrator().FullDataTypeOf(field).SQL; !strings.HasPrefix(strings.ToLower(got), strings.ToLower(expected)) {
			t.Fatalf("PostgreSQL %s type = %q, want %q", fieldName, got, expected)
		}
	}
}
