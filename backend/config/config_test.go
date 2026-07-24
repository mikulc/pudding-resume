package config

import (
	"strings"
	"testing"
)

func TestValidateAllowsDevelopmentDefaults(t *testing.T) {
	cfg := &Config{
		AppEnv:       "development",
		DBPassword:   "postgres",
		JWTSecret:    defaultDevelopmentJWTSecret,
		CookieSecure: false,
	}

	if err := cfg.Validate(); err != nil {
		t.Fatalf("development configuration should be accepted: %v", err)
	}
}

func TestValidateRejectsProductionDefaults(t *testing.T) {
	cfg := &Config{
		AppEnv:         "production",
		DBPassword:     "postgres",
		JWTSecret:      defaultDevelopmentJWTSecret,
		CookieSecure:   false,
		AllowedOrigins: "",
	}

	err := cfg.Validate()
	if err == nil {
		t.Fatal("production defaults should be rejected")
	}

	for _, expected := range []string{"DB_PASSWORD", "JWT_SECRET", "COOKIE_SECURE", "ALLOWED_ORIGINS"} {
		if !strings.Contains(err.Error(), expected) {
			t.Errorf("expected validation error to mention %s: %v", expected, err)
		}
	}
}

func TestValidateAcceptsProductionConfiguration(t *testing.T) {
	cfg := &Config{
		AppEnv:         "production",
		DBPassword:     "unique-production-password",
		JWTSecret:      strings.Repeat("a", 32),
		CookieSecure:   true,
		AllowedOrigins: "https://resume.example.com",
	}

	if err := cfg.Validate(); err != nil {
		t.Fatalf("valid production configuration was rejected: %v", err)
	}
}

func TestCORSOriginsTrimsAndDropsEmptyValues(t *testing.T) {
	cfg := &Config{AllowedOrigins: " https://one.example.com, ,https://two.example.com "}
	origins := cfg.CORSOrigins()

	if len(origins) != 2 || origins[0] != "https://one.example.com" || origins[1] != "https://two.example.com" {
		t.Fatalf("unexpected origins: %#v", origins)
	}
}
