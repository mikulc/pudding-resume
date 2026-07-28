package database

import (
	"strings"
	"testing"
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
