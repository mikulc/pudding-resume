package middleware

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"pudding-resume-backend/services"
)

func TestRequestLoggerEmitsStructuredSafeRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := services.NewLogStore(20)
	logger := slog.New(store.Handler("http", slog.LevelDebug))
	router := gin.New()
	router.Use(RequestID(), RequestLogger(logger), Recovery(logger))
	router.GET("/missing", func(c *gin.Context) { c.Status(http.StatusNotFound) })

	request := httptest.NewRequest(http.MethodGet, "/missing?access_token=secret", nil)
	request.Header.Set(RequestIDHeader, "req-123")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	entries := store.Snapshot(services.LogFilter{Limit: 10}).Entries
	if len(entries) != 1 || entries[0].Level != "warn" || entries[0].Source != "http" {
		t.Fatalf("unexpected request log: %+v", entries)
	}
	attrs := entries[0].Attributes
	if attrs["request_id"] != "req-123" || attrs["path"] != "/missing" || attrs["status"] != int64(http.StatusNotFound) {
		t.Fatalf("missing request attributes: %+v", attrs)
	}
	if _, exists := attrs["query"]; exists {
		t.Fatalf("query string must not be logged: %+v", attrs)
	}
}

func TestRecoveryLogsPanic(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := services.NewLogStore(20)
	logger := slog.New(store.Handler("http", slog.LevelDebug))
	router := gin.New()
	router.Use(RequestID(), RequestLogger(logger), Recovery(logger))
	router.GET("/panic", func(_ *gin.Context) { panic("boom") })

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/panic", nil))
	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d", response.Code)
	}
	entries := store.Snapshot(services.LogFilter{Limit: 10, Level: "error"}).Entries
	if len(entries) != 2 || entries[0].Message != "http_panic" || entries[1].Message != "http_request" {
		t.Fatalf("unexpected panic logs: %+v", entries)
	}
}
