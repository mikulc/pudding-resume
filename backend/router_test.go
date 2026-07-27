package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"pudding-resume-backend/config"
)

func TestLoadDotEnvAcceptsUTF8BOM(t *testing.T) {
	const key = "PUDDING_TEST_BOM_ENV"
	_ = os.Unsetenv(key)
	t.Cleanup(func() { _ = os.Unsetenv(key) })

	path := filepath.Join(t.TempDir(), ".env")
	content := append([]byte{0xEF, 0xBB, 0xBF}, []byte(key+"=loaded\n")...)
	if err := os.WriteFile(path, content, 0600); err != nil {
		t.Fatalf("write .env: %v", err)
	}
	if err := loadDotEnv(path); err != nil {
		t.Fatalf("loadDotEnv() error = %v", err)
	}
	if got := os.Getenv(key); got != "loaded" {
		t.Fatalf("%s = %q, want loaded", key, got)
	}
}

func TestLoadDotEnvPreservesProcessEnvironment(t *testing.T) {
	const key = "PUDDING_TEST_ENV_PRECEDENCE"
	t.Setenv(key, "process")
	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte(key+"=file\n"), 0600); err != nil {
		t.Fatalf("write .env: %v", err)
	}
	if err := loadDotEnv(path); err != nil {
		t.Fatalf("loadDotEnv() error = %v", err)
	}
	if got := os.Getenv(key); got != "process" {
		t.Fatalf("%s = %q, want process", key, got)
	}
}

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

func TestPublicConfigReportsRegistrationEmailCodeFlag(t *testing.T) {
	cfg := config.Load()
	cfg.RegistrationEmailCodeEnabled = true
	router := NewRouter(cfg, t.TempDir())

	request := httptest.NewRequest(http.MethodGet, "/api/config/public", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("GET /api/config/public status = %d, want %d", response.Code, http.StatusOK)
	}
	var body struct {
		RegistrationEmailCodeEnabled bool `json:"registration_email_code_enabled"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode public config: %v", err)
	}
	if !body.RegistrationEmailCodeEnabled {
		t.Fatal("registration_email_code_enabled = false, want true")
	}
	var fields map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &fields); err != nil {
		t.Fatalf("decode public config fields: %v", err)
	}
	if len(fields) != 1 {
		t.Fatalf("public config fields = %#v, want only registration_email_code_enabled", fields)
	}
}
