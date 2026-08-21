package services

import (
	"fmt"
	"log/slog"
	"testing"
)

func TestLogStoreKeepsRecentEntriesAndFilters(t *testing.T) {
	store := NewLogStore(3)
	store.Add("app", "info", "started", nil)
	store.Add("http", "warn", "GET /missing 404", nil)
	store.Add("app", "error", "worker failed", map[string]any{"request_id": "req-1"})
	store.Add("http", "info", "GET /health 200", nil)

	all := store.Snapshot(LogFilter{Limit: 10})
	if len(all.Entries) != 3 || all.Total != 4 || all.Dropped != 1 {
		t.Fatalf("unexpected snapshot: %+v", all)
	}
	if all.Entries[0].Message != "GET /missing 404" || all.Entries[2].Message != "GET /health 200" {
		t.Fatalf("entries are not chronological: %+v", all.Entries)
	}

	errors := store.Snapshot(LogFilter{Limit: 10, Level: "error", Query: "WORKER"})
	if len(errors.Entries) != 1 || errors.Entries[0].Source != "app" {
		t.Fatalf("unexpected filtered snapshot: %+v", errors)
	}
	incremental := store.Snapshot(LogFilter{Limit: 10, After: 3})
	if len(incremental.Entries) != 1 || incremental.NextCursor != 4 {
		t.Fatalf("unexpected incremental snapshot: %+v", incremental)
	}
}

func TestLogStoreSlogHandlerPreservesAttrsAndRedactsSecrets(t *testing.T) {
	store := NewLogStore(10)
	logger := slog.New(store.Handler("app", slog.LevelDebug)).With("service", "email")
	logger.Error("send failed", "request_id", "req-7", "api_key", "super-secret")

	entries := store.Snapshot(LogFilter{Limit: 10, Query: "req-7"}).Entries
	if len(entries) != 1 || entries[0].Level != "error" || entries[0].Attributes["service"] != "email" {
		t.Fatalf("unexpected structured entry: %+v", entries)
	}
	if entries[0].Attributes["api_key"] != "[REDACTED]" {
		t.Fatalf("secret was not redacted: %+v", entries[0].Attributes)
	}
}

func TestRedactSlogAttrProtectsJSONOutput(t *testing.T) {
	secret := RedactSlogAttr(nil, slog.String("password", "open-sesame"))
	if secret.Value.String() != "[REDACTED]" {
		t.Fatalf("secret attr was not redacted: %+v", secret)
	}
	message := RedactSlogAttr(nil, slog.String(slog.MessageKey, "call api_key=abc123 now"))
	if message.Value.String() != "call api_key=[REDACTED] now" {
		t.Fatalf("message was not redacted: %q", message.Value.String())
	}
}

func TestLogStoreWriterInfersLevels(t *testing.T) {
	store := NewLogStore(10)
	writer := store.Writer("http")
	_, _ = fmt.Fprintln(writer, "[GIN] | 503 | GET /api/health")
	_, _ = fmt.Fprintln(writer, "[GIN] | 204 | OPTIONS /api/health")

	entries := store.Snapshot(LogFilter{Limit: 10}).Entries
	if len(entries) != 2 || entries[0].Level != "error" || entries[1].Level != "info" {
		t.Fatalf("unexpected levels: %+v", entries)
	}
}
