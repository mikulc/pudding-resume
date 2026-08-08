package config

import (
	"strings"
	"testing"

	mysqlconfig "github.com/go-sql-driver/mysql"
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

func TestValidateEmailCodeConfiguration(t *testing.T) {
	cfg := &Config{
		AppEnv:                       "development",
		RegistrationEmailCodeEnabled: true,
		RedisAddr:                    "localhost:6379",
		SMTPHost:                     "smtp.example.com",
		SMTPFromAddress:              "no-reply@example.com",
		SMTPTLSMode:                  "starttls",
		EmailCodeSecret:              strings.Repeat("s", 32),
		EmailCodeTTL:                 "5m",
		RegistrationTicketTTL:        "10m",
		EmailCodeCooldown:            "60s",
		EmailCodeMaxAttempts:         5,
		EmailCodeMaxPerEmailHour:     5,
		EmailCodeMaxPerIPHour:        20,
		RedisKeyPrefix:               "pudding:test",
		EmailQueueWorkers:            1,
		EmailQueueMaxAttempts:        3,
		EmailQueueLease:              "30s",
		EmailQueuePoll:               "1s",
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("valid email code configuration was rejected: %v", err)
	}

	cfg.EmailCodeTTL = "invalid"
	if err := cfg.Validate(); err == nil || !strings.Contains(err.Error(), "EMAIL_CODE_TTL") {
		t.Fatalf("invalid EMAIL_CODE_TTL error = %v", err)
	}

	cfg.EmailCodeTTL = "5m"
	cfg.EmailCodeSecret = "CHANGE_ME_TO_A_RANDOM_SECRET_WITH_AT_LEAST_32_CHARACTERS"
	if err := cfg.Validate(); err == nil || !strings.Contains(err.Error(), "EMAIL_CODE_SECRET") {
		t.Fatalf("placeholder EMAIL_CODE_SECRET error = %v", err)
	}
}

func TestDatabaseDriverAliases(t *testing.T) {
	for input, expected := range map[string]string{
		"": "postgres", "pg": "postgres", "postgresql": "postgres", "mysql": "mysql",
	} {
		if got := (&Config{DBDriver: input}).DatabaseDriver(); got != expected {
			t.Fatalf("DatabaseDriver(%q) = %q, want %q", input, got, expected)
		}
	}
}

func TestMySQLDSN(t *testing.T) {
	cfg := &Config{
		DBDriver:   "mysql",
		DBHost:     "db.example.com",
		DBPort:     "3307",
		DBUser:     "resume",
		DBPassword: "p@ss:word",
		DBName:     "pudding_resume",
		DBTimeZone: "Asia/Shanghai",
		DBCharset:  "utf8mb4",
		DBTLS:      "false",
	}

	parsed, err := mysqlconfig.ParseDSN(cfg.DSN())
	if err != nil {
		t.Fatalf("ParseDSN: %v", err)
	}
	if parsed.Addr != "db.example.com:3307" || parsed.User != "resume" || parsed.Passwd != "p@ss:word" {
		t.Fatalf("unexpected MySQL DSN: %#v", parsed)
	}
	if !parsed.ParseTime || parsed.Loc.String() != "Asia/Shanghai" || parsed.Params["charset"] != "utf8mb4" {
		t.Fatalf("missing MySQL DSN options: %#v", parsed)
	}
}

func TestLoadUsesMySQLDefaults(t *testing.T) {
	t.Setenv("DB_DRIVER", "mysql")
	t.Setenv("DB_PORT", "")
	t.Setenv("DB_USER", "")
	t.Setenv("DB_PASSWORD", "")

	cfg := Load()
	if cfg.DatabaseDriver() != "mysql" || cfg.DBPort != "3306" || cfg.DBUser != "root" || cfg.DBPassword != "" {
		t.Fatalf("unexpected MySQL defaults: driver=%q port=%q user=%q password=%q", cfg.DatabaseDriver(), cfg.DBPort, cfg.DBUser, cfg.DBPassword)
	}
}

func TestValidateRejectsUnknownDatabaseDriver(t *testing.T) {
	cfg := &Config{DBDriver: "sqlite"}
	if err := cfg.Validate(); err == nil || !strings.Contains(err.Error(), "DB_DRIVER") {
		t.Fatalf("invalid DB_DRIVER error = %v", err)
	}
}
