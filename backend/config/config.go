package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

const defaultDevelopmentJWTSecret = "pudding-resume-dev-secret-change-in-production"

// Config holds all configuration for the application.
type Config struct {
	AppEnv       string
	ServerPort   string
	CookieSecure bool

	// PostgreSQL
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	DBTimeZone string

	// JWT
	JWTSecret            string
	JWTExpiration        string // e.g. "1h" for access token
	JWTRefreshExpiration string // e.g. "168h" (7d) for refresh token

	// Redis and registration email verification codes
	RedisAddr                    string
	RedisUsername                string
	RedisPassword                string
	RedisDB                      int
	RedisTLSEnabled              bool
	RedisTLSServerName           string
	RedisKeyPrefix               string
	RegistrationEmailCodeEnabled bool
	EmailCodeSecret              string
	EmailCodeTTL                 string
	RegistrationTicketTTL        string
	EmailCodeCooldown            string
	EmailCodeMaxAttempts         int
	EmailCodeMaxPerEmailHour     int
	EmailCodeMaxPerIPHour        int

	// SMTP
	SMTPHost        string
	SMTPPort        int
	SMTPUsername    string
	SMTPPassword    string
	SMTPFromAddress string
	SMTPFromName    string
	SMTPTLSMode     string // starttls, tls, or none

	// Reliable Redis-backed email queue
	EmailQueueWorkers     int
	EmailQueueMaxAttempts int
	EmailQueueLease       string
	EmailQueuePoll        string

	// Upload
	UploadDir string // directory for avatar uploads

	// Chromium
	ChromiumPath string // path to Chromium/Chrome executable, defaults to system PATH lookup

	// Fonts
	FontsDir       string // directory containing .woff2 font files for PDF/PNG export
	FontCDNBaseURL string // CDN base URL for lazy font downloading during export

	// CORS
	AllowedOrigins string // comma-separated list of allowed origins, e.g. "http://localhost:5173,https://example.com"
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	appEnv := strings.ToLower(getEnv("APP_ENV", "development"))
	return &Config{
		AppEnv:       appEnv,
		ServerPort:   getEnv("SERVER_PORT", "8080"),
		CookieSecure: getEnvBool("COOKIE_SECURE", false),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "pudding_resume"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		DBTimeZone: getEnv("DB_TIMEZONE", "Asia/Shanghai"),

		JWTSecret:            getEnv("JWT_SECRET", defaultDevelopmentJWTSecret),
		JWTExpiration:        getEnv("JWT_EXPIRATION", "1h"),
		JWTRefreshExpiration: getEnv("JWT_REFRESH_EXPIRATION", "168h"),

		RedisAddr:                    getEnv("REDIS_ADDR", "localhost:6379"),
		RedisUsername:                os.Getenv("REDIS_USERNAME"),
		RedisPassword:                os.Getenv("REDIS_PASSWORD"),
		RedisDB:                      getEnvInt("REDIS_DB", 0),
		RedisTLSEnabled:              getEnvBool("REDIS_TLS_ENABLED", false),
		RedisTLSServerName:           os.Getenv("REDIS_TLS_SERVER_NAME"),
		RedisKeyPrefix:               getEnv("REDIS_KEY_PREFIX", "pudding:"+appEnv),
		RegistrationEmailCodeEnabled: getEnvBool("REGISTRATION_EMAIL_CODE_ENABLED", false),
		EmailCodeSecret:              getEnv("EMAIL_CODE_SECRET", getEnv("JWT_SECRET", defaultDevelopmentJWTSecret)),
		EmailCodeTTL:                 getEnv("EMAIL_CODE_TTL", "5m"),
		RegistrationTicketTTL:        getEnv("REGISTRATION_TICKET_TTL", "10m"),
		EmailCodeCooldown:            getEnv("EMAIL_CODE_COOLDOWN", "60s"),
		EmailCodeMaxAttempts:         getEnvInt("EMAIL_CODE_MAX_ATTEMPTS", 5),
		EmailCodeMaxPerEmailHour:     getEnvInt("EMAIL_CODE_MAX_PER_EMAIL_HOUR", 5),
		EmailCodeMaxPerIPHour:        getEnvInt("EMAIL_CODE_MAX_PER_IP_HOUR", 20),

		SMTPHost:        os.Getenv("SMTP_HOST"),
		SMTPPort:        getEnvInt("SMTP_PORT", 587),
		SMTPUsername:    os.Getenv("SMTP_USERNAME"),
		SMTPPassword:    os.Getenv("SMTP_PASSWORD"),
		SMTPFromAddress: os.Getenv("SMTP_FROM_ADDRESS"),
		SMTPFromName:    getEnv("SMTP_FROM_NAME", "Pudding Resume"),
		SMTPTLSMode:     strings.ToLower(getEnv("SMTP_TLS_MODE", "starttls")),

		EmailQueueWorkers:     getEnvInt("EMAIL_QUEUE_WORKERS", 2),
		EmailQueueMaxAttempts: getEnvInt("EMAIL_QUEUE_MAX_ATTEMPTS", 3),
		EmailQueueLease:       getEnv("EMAIL_QUEUE_LEASE", "30s"),
		EmailQueuePoll:        getEnv("EMAIL_QUEUE_POLL", "1s"),

		UploadDir:      getEnv("UPLOAD_DIR", "./uploads"),
		ChromiumPath:   os.Getenv("CHROMIUM_PATH"),
		FontsDir:       getEnv("FONTS_DIR", "./fonts"),
		FontCDNBaseURL: os.Getenv("FONT_CDN_BASE_URL"),

		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"),
	}
}

// Validate rejects development-only defaults when running in production.
func (c *Config) Validate() error {
	var problems []string
	if c.RegistrationEmailCodeEnabled {
		if c.RedisAddr == "" {
			problems = append(problems, "REDIS_ADDR must be set when registration email codes are enabled")
		}
		if c.SMTPHost == "" || c.SMTPFromAddress == "" {
			problems = append(problems, "SMTP_HOST and SMTP_FROM_ADDRESS must be set when registration email codes are enabled")
		}
		if c.EmailCodeSecret == "" || len(c.EmailCodeSecret) < 32 || strings.HasPrefix(strings.ToUpper(c.EmailCodeSecret), "CHANGE_ME") {
			problems = append(problems, "EMAIL_CODE_SECRET must be a generated secret containing at least 32 characters")
		}
		if duration, err := time.ParseDuration(c.EmailCodeTTL); err != nil || duration <= 0 {
			problems = append(problems, "EMAIL_CODE_TTL must be a positive duration")
		}
		if duration, err := time.ParseDuration(c.RegistrationTicketTTL); err != nil || duration <= 0 {
			problems = append(problems, "REGISTRATION_TICKET_TTL must be a positive duration")
		}
		if duration, err := time.ParseDuration(c.EmailCodeCooldown); err != nil || duration <= 0 {
			problems = append(problems, "EMAIL_CODE_COOLDOWN must be a positive duration")
		}
		if c.EmailCodeMaxAttempts <= 0 || c.EmailCodeMaxPerEmailHour <= 0 || c.EmailCodeMaxPerIPHour <= 0 {
			problems = append(problems, "email code limits must be positive")
		}
		if strings.TrimSpace(c.RedisKeyPrefix) == "" {
			problems = append(problems, "REDIS_KEY_PREFIX must not be empty")
		}
		if c.EmailQueueWorkers <= 0 || c.EmailQueueMaxAttempts <= 0 {
			problems = append(problems, "email queue worker and attempt limits must be positive")
		}
		if duration, err := time.ParseDuration(c.EmailQueueLease); err != nil || duration <= 0 {
			problems = append(problems, "EMAIL_QUEUE_LEASE must be a positive duration")
		}
		if duration, err := time.ParseDuration(c.EmailQueuePoll); err != nil || duration <= 0 {
			problems = append(problems, "EMAIL_QUEUE_POLL must be a positive duration")
		}
		switch c.SMTPTLSMode {
		case "starttls", "tls", "none":
		default:
			problems = append(problems, "SMTP_TLS_MODE must be starttls, tls, or none")
		}
	}

	if c.AppEnv == "production" {
		if c.RegistrationEmailCodeEnabled && c.SMTPTLSMode == "none" {
			problems = append(problems, "SMTP_TLS_MODE must use TLS in production")
		}
		if c.DBPassword == "" || c.DBPassword == "postgres" || c.DBPassword == "CHANGE_ME" {
			problems = append(problems, "DB_PASSWORD must be set to a non-default value")
		}
		if c.JWTSecret == "" || c.JWTSecret == defaultDevelopmentJWTSecret || c.JWTSecret == "CHANGE_ME" || len(c.JWTSecret) < 32 {
			problems = append(problems, "JWT_SECRET must be a unique value with at least 32 characters")
		}
		if !c.CookieSecure {
			problems = append(problems, "COOKIE_SECURE must be true")
		}
		if len(c.CORSOrigins()) == 0 {
			problems = append(problems, "ALLOWED_ORIGINS must contain at least one origin")
		}
		for _, origin := range c.CORSOrigins() {
			if origin == "*" {
				problems = append(problems, "ALLOWED_ORIGINS must not use wildcard with credentialed requests")
				break
			}
		}
	}
	if len(problems) > 0 {
		return errors.New(strings.Join(problems, "; "))
	}
	return nil
}

// DSN returns the PostgreSQL connection string.
func (c *Config) DSN() string {
	return "host=" + c.DBHost +
		" user=" + c.DBUser +
		" password=" + c.DBPassword +
		" dbname=" + c.DBName +
		" port=" + c.DBPort +
		" sslmode=" + c.DBSSLMode +
		" TimeZone=" + c.DBTimeZone
}

// CORSOrigins returns the allowed origins as a string slice.
func (c *Config) CORSOrigins() []string {
	if c.AllowedOrigins == "" {
		return nil
	}
	origins := make([]string, 0)
	for _, value := range strings.Split(c.AllowedOrigins, ",") {
		if origin := strings.TrimSpace(value); origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
