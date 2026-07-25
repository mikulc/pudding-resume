package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"pudding-resume-backend/config"
)

func TestNewRouterRegistersHealthRoute(t *testing.T) {
	cfg := config.Load()
	router := NewRouter(cfg, t.TempDir())

	request := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("GET /api/health status = %d, want %d", response.Code, http.StatusOK)
	}
	if got := response.Body.String(); got != `{"status":"ok"}` {
		t.Fatalf("GET /api/health body = %q", got)
	}
}
