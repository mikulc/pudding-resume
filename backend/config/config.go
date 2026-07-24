package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
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
	return &Config{
		AppEnv:       strings.ToLower(getEnv("APP_ENV", "development")),
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

		UploadDir:      getEnv("UPLOAD_DIR", "./uploads"),
		ChromiumPath:   os.Getenv("CHROMIUM_PATH"),
		FontsDir:       getEnv("FONTS_DIR", "./fonts"),
		FontCDNBaseURL: os.Getenv("FONT_CDN_BASE_URL"),

		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"),
	}
}

// Validate rejects development-only defaults when running in production.
func (c *Config) Validate() error {
	if c.AppEnv != "production" {
		return nil
	}

	var problems []string
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
