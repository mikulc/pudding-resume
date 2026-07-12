package config

import (
	"os"
	"strings"
)

// Config holds all configuration for the application.
type Config struct {
	ServerPort string

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
		ServerPort: getEnv("SERVER_PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "pudding_resume"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		DBTimeZone: getEnv("DB_TIMEZONE", "Asia/Shanghai"),

		JWTSecret:            getEnv("JWT_SECRET", "pudding-resume-dev-secret-change-in-production"),
		JWTExpiration:        getEnv("JWT_EXPIRATION", "1h"),
		JWTRefreshExpiration: getEnv("JWT_REFRESH_EXPIRATION", "168h"),

		UploadDir:          getEnv("UPLOAD_DIR", "./uploads"),
		ChromiumPath:       os.Getenv("CHROMIUM_PATH"),
		FontsDir:       getEnv("FONTS_DIR", "./fonts"),
		FontCDNBaseURL: os.Getenv("FONT_CDN_BASE_URL"),

		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"),
	}
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
	return strings.Split(c.AllowedOrigins, ",")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
