package database

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"gorm.io/datatypes"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"pudding-resume-backend/config"
	"pudding-resume-backend/models"
)

var DB *gorm.DB

// marshalJSON is a package-level helper for marshaling values into datatypes.JSON.
func marshalJSON(v any) datatypes.JSON {
	b, _ := json.Marshal(v)
	return datatypes.JSON(b)
}

// Init connects to PostgreSQL and runs auto-migration.
func Init(cfg *config.Config) {
	dsn := cfg.DSN()

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}

	// Auto-migrate: GORM will create tables if they don't exist.
	// Note: the database itself must be created manually beforehand.
	if err := DB.AutoMigrate(
		&models.User{}, &models.UserPreference{},
		&models.AIServiceConfig{}, &models.AIModelPool{},
		&models.AIUsageLog{},
		&models.Resume{}, &models.ResumeShare{},
		&models.StyleLibrary{},
		&models.UserQuota{}, &models.UserStats{}, &models.UserDailyStats{},
		&models.DocumentSetting{}, &models.DemoContent{},
		&models.ChangelogEntry{}, &models.AdminAuditLog{},
	); err != nil {
		log.Fatalf("Failed to auto-migrate database: %v", err)
	}

	seedAll()
	migrateTableComments(DB)

	fmt.Println("Database connected and migrated successfully.")
}

// seedAll runs all table seeders. Each seeder is a no-op when the table already has data.
func seedAll() {
	seedStyleLibraries()
	seedDocSettings()
	seedDemoContent()
}

// migrateTableComments adds Chinese comments to PostgreSQL tables.
// Safe to call on every startup — uses COMMENT ON which is idempotent.
func migrateTableComments(db *gorm.DB) {
	comments := map[string]string{
		"user_info":         "用户表",
		"user_preference":   "用户偏好设置表",
		"ai_service_config": "AI 服务商配置表",
		"ai_model_pool":     "公共AI模型池表",
		"ai_usage_logs":     "AI 用量调用日志表",
		"user_resumes":      "用户简历表",
		"style_library":     "样式库表",
		"user_quota":        "用户配额表",
		"user_stats":        "用户统计表",
		"user_daily_stats":  "每日统计表",
		"doc_settings":      "文档设置表",
		"resume_shares":     "简历分享配置表",
		"demo_content":      "示例简历内容表",
		"changelog_entries": "更新日志条目表",
		"admin_audit_logs":  "管理员操作审计日志表",
	}

	for table, comment := range comments {
		sql := "COMMENT ON TABLE " + table + " IS '" + strings.ReplaceAll(comment, "'", "''") + "'"
		if err := db.Exec(sql).Error; err != nil {
			fmt.Printf("Warning: failed to set comment on table %s: %v\n", table, err)
		}
	}
}
