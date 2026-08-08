package handlers

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	mysqldriver "github.com/go-sql-driver/mysql"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestRegistrationConflictMessage(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		want       string
		isConflict bool
	}{
		{
			name:       "active email index",
			err:        &pgconn.PgError{Code: "23505", ConstraintName: "idx_user_info_email_active"},
			want:       "该邮箱已被注册",
			isConflict: true,
		},
		{
			name:       "another unique constraint",
			err:        &pgconn.PgError{Code: "23505", ConstraintName: "other"},
			isConflict: false,
		},
		{
			name:       "mysql active email index",
			err:        &mysqldriver.MySQLError{Number: 1062, Message: "Duplicate entry for key 'idx_user_info_email_active'"},
			want:       "该邮箱已被注册",
			isConflict: true,
		},
		{
			name:       "mysql another unique index",
			err:        &mysqldriver.MySQLError{Number: 1062, Message: "Duplicate entry for key 'other'"},
			isConflict: false,
		},
		{name: "not unique", err: errors.New("boom")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, conflict := registrationConflictMessage(tt.err)
			if got != tt.want || conflict != tt.isConflict {
				t.Fatalf("registrationConflictMessage() = (%q, %v), want (%q, %v)", got, conflict, tt.want, tt.isConflict)
			}
		})
	}
}

func TestNormalizeEmail(t *testing.T) {
	if got := normalizeEmail("  User@Example.COM "); got != "user@example.com" {
		t.Fatalf("normalizeEmail() = %q", got)
	}
}

func TestRemoveAvatarFileStaysInsideUploadDirectory(t *testing.T) {
	root := t.TempDir()
	inside := filepath.Join(root, "avatars", "avatar.png")
	if err := os.MkdirAll(filepath.Dir(inside), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(inside, []byte("avatar"), 0o600); err != nil {
		t.Fatal(err)
	}

	outside := filepath.Join(filepath.Dir(root), "outside-avatar.png")
	if err := os.WriteFile(outside, []byte("keep"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Remove(outside) })

	removeAvatarFile(root, filepath.Join("avatars", "avatar.png"))
	if _, err := os.Stat(inside); !os.IsNotExist(err) {
		t.Fatalf("inside avatar was not removed: %v", err)
	}

	removeAvatarFile(root, filepath.Join("..", filepath.Base(outside)))
	if _, err := os.Stat(outside); err != nil {
		t.Fatalf("outside file was touched: %v", err)
	}
}
