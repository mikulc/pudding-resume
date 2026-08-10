package models

import (
	"sync"
	"testing"

	"gorm.io/gorm/schema"
)

func TestResumeHasIndexForUserUpdatedListing(t *testing.T) {
	parsed, err := schema.Parse(&Resume{}, &sync.Map{}, schema.NamingStrategy{})
	if err != nil {
		t.Fatalf("parse Resume schema: %v", err)
	}

	index := parsed.LookIndex("idx_user_resumes_user_updated")
	if index == nil {
		t.Fatal("missing composite index for the resume list query")
	}

	got := make([]string, 0, len(index.Fields))
	for _, field := range index.Fields {
		got = append(got, field.DBName)
	}
	want := []string{"user_id", "deleted_at", "updated_at", "id"}
	if len(got) != len(want) {
		t.Fatalf("index columns = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("index columns = %v, want %v", got, want)
		}
	}
}
