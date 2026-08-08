package models

import (
	"testing"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestUUIDDatabaseTypes(t *testing.T) {
	tests := []struct {
		name      string
		dialector gorm.Dialector
		want      string
	}{
		{name: "postgres", dialector: postgres.Open(""), want: "uuid"},
		{name: "mysql", dialector: mysql.Open(""), want: "char(36)"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := &gorm.DB{Config: &gorm.Config{Dialector: tt.dialector}}
			if got := (UUID("")).GormDBDataType(db, nil); got != tt.want {
				t.Fatalf("GormDBDataType() = %q, want %q", got, tt.want)
			}
		})
	}
}
