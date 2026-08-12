package database

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"reflect"
	"strings"
	"time"

	"gorm.io/datatypes"
	"gorm.io/driver/mysql"
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

// Init connects to the configured database and runs auto-migration.
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

	dialector, err := databaseDialector(cfg.DatabaseDriver(), dsn)
	if err != nil {
		log.Fatalf("Invalid database configuration: %v", err)
	}
	DB, err = gorm.Open(dialector, &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Fatalf("Failed to connect to %s: %v", cfg.DatabaseDriver(), err)
	}
	registerUUIDCreateCallback(DB)

	migrateStyleLibraryTable(DB)

	// Auto-migrate: GORM will create tables if they don't exist.
	// Note: the database itself must be created manually beforehand.
	if err := DB.AutoMigrate(
		&models.User{}, &models.UserPreference{},
		&models.AIServiceConfig{},
		&models.AIUsageLog{},
		&models.Resume{}, &models.ResumeShare{},
		&models.ThemeLibrary{}, &models.TemplateLibrary{},
		&models.UserQuota{}, &models.UserStats{}, &models.UserDailyStats{},
	); err != nil {
		log.Fatalf("Failed to auto-migrate database: %v", err)
	}

	migrateActiveUserEmailUniqueIndex(DB)
	dropAIServiceConfigAPIKeyColumn(DB)
	dropUnusedLive2DPreferenceColumns(DB)
	dropThemeLibraryDescriptionColumn(DB)
	dropThemeLibraryLegacyCategoryColumn(DB)
	dropRetiredAdminAuditLogsTable(DB)
	dropRetiredAIModelPoolSchema(DB)
	dropRetiredChangelogTable(DB)
	dropRetiredDemoContentTable(DB)
	dropRetiredDocSettingsTable(DB)
	seedAll()
	migrateTableComments(DB)

	fmt.Printf("%s database connected and migrated successfully.\n", cfg.DatabaseDriver())
}

func databaseDialector(driver, dsn string) (gorm.Dialector, error) {
	switch driver {
	case "postgres":
		return postgres.Open(dsn), nil
	case "mysql":
		return mysql.Open(dsn), nil
	default:
		return nil, fmt.Errorf("unsupported DB_DRIVER %q", driver)
	}
}

func registerUUIDCreateCallback(db *gorm.DB) {
	err := db.Callback().Create().Before("gorm:before_create").Register("pudding:assign_uuid", func(tx *gorm.DB) {
		if tx.Statement.Schema == nil || tx.Statement.Schema.PrioritizedPrimaryField == nil {
			return
		}
		field := tx.Statement.Schema.PrioritizedPrimaryField
		if field.FieldType != reflect.TypeOf(models.UUID("")) {
			return
		}

		setUUID := func(value reflect.Value) {
			for value.Kind() == reflect.Pointer {
				if value.IsNil() {
					return
				}
				value = value.Elem()
			}
			if value.Kind() != reflect.Struct {
				return
			}
			_, zero := field.ValueOf(tx.Statement.Context, value)
			if zero {
				if err := field.Set(tx.Statement.Context, value, models.NewUUID()); err != nil {
					tx.AddError(err)
				}
			}
		}

		value := tx.Statement.ReflectValue
		for value.Kind() == reflect.Pointer {
			if value.IsNil() {
				return
			}
			value = value.Elem()
		}
		if value.Kind() == reflect.Slice || value.Kind() == reflect.Array {
			for index := 0; index < value.Len(); index++ {
				setUUID(value.Index(index))
			}
			return
		}
		setUUID(value)
	})
	if err != nil {
		log.Fatalf("Failed to register UUID callback: %v", err)
	}
}

// migrateActiveUserEmailUniqueIndex keeps email unique only among active users.
// Username is a display name and may be shared by multiple accounts.
// Soft-deleted accounts do not reserve their former email address, while the
// database remains the final concurrency guard for email-based authentication.
func migrateActiveUserEmailUniqueIndex(db *gorm.DB) {
	if db.Dialector.Name() == "mysql" {
		if err := migrateMySQLActiveUserEmailUniqueIndex(db); err != nil {
			log.Fatalf("Failed to migrate active-user email unique index: %v", err)
		}
		return
	}
	err := db.Transaction(func(tx *gorm.DB) error {
		for _, statement := range activeUserEmailIndexMigrationStatements() {
			if err := tx.Exec(statement).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.Fatalf("Failed to migrate active-user email unique index: %v", err)
	}
}

func migrateMySQLActiveUserEmailUniqueIndex(db *gorm.DB) error {
	// MySQL implicitly commits DDL, so run this idempotent migration without a
	// surrounding transaction.
	for _, index := range []string{
		"idx_user_info_email",
		"idx_user_info_username",
		"idx_user_info_username_active",
	} {
		if db.Migrator().HasIndex("user_info", index) {
			if err := db.Migrator().DropIndex("user_info", index); err != nil {
				return err
			}
		}
	}
	if !db.Migrator().HasColumn("user_info", "active_email") {
		if err := db.Exec(`ALTER TABLE user_info
				ADD COLUMN active_email VARCHAR(128)
				GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN LOWER(email) ELSE NULL END) STORED`).Error; err != nil {
			return err
		}
	}
	if !db.Migrator().HasIndex("user_info", "idx_user_info_email_active") {
		return db.Exec(`CREATE UNIQUE INDEX idx_user_info_email_active ON user_info (active_email)`).Error
	}
	return nil
}

func activeUserEmailIndexMigrationStatements() []string {
	return []string{
		`DROP INDEX IF EXISTS idx_user_info_email`,
		`DROP INDEX IF EXISTS idx_user_info_username`,
		`DROP INDEX IF EXISTS idx_user_info_username_active`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_info_email_active
			ON user_info (LOWER(email)) WHERE deleted_at IS NULL`,
	}
}

// migrateStyleLibraryTable preserves existing installations while adopting the
// clearer theme_library domain name.
func migrateStyleLibraryTable(db *gorm.DB) {
	if !db.Migrator().HasTable("style_library") || db.Migrator().HasTable("theme_library") {
		return
	}
	if err := db.Migrator().RenameTable("style_library", "theme_library"); err != nil {
		log.Fatalf("Failed to rename style_library to theme_library: %v", err)
	}
}

// dropThemeLibraryDescriptionColumn removes the retired template description
// field from existing databases. GORM AutoMigrate keeps obsolete columns.
func dropThemeLibraryDescriptionColumn(db *gorm.DB) {
	if !db.Migrator().HasColumn(&models.ThemeLibrary{}, "description") {
		return
	}
	if err := db.Migrator().DropColumn(&models.ThemeLibrary{}, "description"); err != nil {
		log.Fatalf("Failed to drop theme_library.description: %v", err)
	}
}

// dropAIServiceConfigAPIKeyColumn removes credentials persisted by older
// versions. API keys are now supplied per request from browser-local storage.
func dropAIServiceConfigAPIKeyColumn(db *gorm.DB) {
	if !db.Migrator().HasColumn(&models.AIServiceConfig{}, "api_key") {
		return
	}
	if err := db.Migrator().DropColumn(&models.AIServiceConfig{}, "api_key"); err != nil {
		log.Fatalf("Failed to drop ai_service_config.api_key: %v", err)
	}
}

// dropUnusedLive2DPreferenceColumns keeps only settings that are exposed by
// the product UI. Rendering constants remain browser-side defaults.
func dropUnusedLive2DPreferenceColumns(db *gorm.DB) {
	columns := []string{
		"live2d_h_offset",
		"live2d_v_offset",
		"live2d_width",
		"live2d_height",
		"live2d_scale",
		"live2d_opacity",
		"live2d_peek_visible_ratio",
		"live2d_nearby_retract_ratio",
		"live2d_proximity_threshold",
		"live2d_restore_delay",
		"live2d_transition_duration",
	}
	for _, column := range columns {
		if !db.Migrator().HasColumn(&models.UserPreference{}, column) {
			continue
		}
		if err := db.Migrator().DropColumn(&models.UserPreference{}, column); err != nil {
			log.Fatalf("Failed to drop user_preference.%s: %v", column, err)
		}
	}
}

// dropThemeLibraryLegacyCategoryColumn removes the retired single-value field.
// theme_library.categories now stores visual classifications as a JSON array.
func dropThemeLibraryLegacyCategoryColumn(db *gorm.DB) {
	if !db.Migrator().HasColumn(&models.ThemeLibrary{}, "category") {
		return
	}
	if err := db.Migrator().DropColumn(&models.ThemeLibrary{}, "category"); err != nil {
		log.Fatalf("Failed to drop theme_library.category: %v", err)
	}
}

// dropRetiredAdminAuditLogsTable removes storage for the retired audit-log feature.
func dropRetiredAdminAuditLogsTable(db *gorm.DB) {
	const table = "admin_audit_logs"
	if !db.Migrator().HasTable(table) {
		return
	}
	if err := db.Migrator().DropTable(table); err != nil {
		log.Fatalf("Failed to drop %s: %v", table, err)
	}
}

// dropRetiredAIModelPoolSchema removes the shared model pool and source-selection columns.
func dropRetiredAIModelPoolSchema(db *gorm.DB) {
	columns := []struct {
		model  any
		column string
	}{
		{&models.AIServiceConfig{}, "public_model_id"},
		{&models.AIServiceConfig{}, "model_source"},
		{&models.AIUsageLog{}, "public_model_id"},
		{&models.AIUsageLog{}, "model_source"},
	}
	for _, item := range columns {
		if db.Migrator().HasColumn(item.model, item.column) {
			if err := db.Migrator().DropColumn(item.model, item.column); err != nil {
				log.Fatalf("Failed to remove retired AI model pool schema: %v", err)
			}
		}
	}
	if db.Migrator().HasTable("ai_model_pool") {
		if err := db.Migrator().DropTable("ai_model_pool"); err != nil {
			log.Fatalf("Failed to remove retired AI model pool schema: %v", err)
		}
	}
}

// dropRetiredChangelogTable removes storage for the retired changelog feature.
func dropRetiredChangelogTable(db *gorm.DB) {
	const table = "changelog_entries"
	if !db.Migrator().HasTable(table) {
		return
	}
	if err := db.Migrator().DropTable(table); err != nil {
		log.Fatalf("Failed to drop %s: %v", table, err)
	}
}

// dropRetiredDemoContentTable removes the hardcoded preview resume storage.
// Resume templates are imported as JSON instead of being seeded at startup.
func dropRetiredDemoContentTable(db *gorm.DB) {
	const table = "demo_content"
	if !db.Migrator().HasTable(table) {
		return
	}
	if err := db.Migrator().DropTable(table); err != nil {
		log.Fatalf("Failed to drop %s: %v", table, err)
	}
}

// dropRetiredDocSettingsTable removes the former database-backed document
// settings. These static UI defaults now live in the frontend configuration.
func dropRetiredDocSettingsTable(db *gorm.DB) {
	const table = "doc_settings"
	if !db.Migrator().HasTable(table) {
		return
	}
	if err := db.Migrator().DropTable(table); err != nil {
		log.Fatalf("Failed to drop %s: %v", table, err)
	}
}

// seedAll runs all table seeders. Each seeder is a no-op when the table already has data.
func seedAll() {
	seedThemeLibraries()
	migrateBundledAvatarURLs()
}

// migrateTableComments adds Chinese comments to PostgreSQL and MySQL tables.
// Safe to call on every startup because both statements replace the current
// table comment rather than appending to it.
func migrateTableComments(db *gorm.DB) {
	comments := map[string]string{
		"user_info":         "用户表",
		"user_preference":   "用户偏好设置表",
		"ai_service_config": "AI 服务商配置表",
		"ai_usage_logs":     "AI 用量调用日志表",
		"user_resumes":      "用户简历表",
		"theme_library":     "简历主题库表",
		"template_library":  "行业简历模板库表",
		"user_quota":        "用户配额表",
		"user_stats":        "用户统计表",
		"user_daily_stats":  "每日统计表",
		"resume_shares":     "简历分享配置表",
	}

	for table, comment := range comments {
		statement, supported := tableCommentStatement(db.Dialector.Name(), table, comment)
		if !supported {
			return
		}
		if err := db.Exec(statement).Error; err != nil {
			fmt.Printf("Warning: failed to set comment on table %s: %v\n", table, err)
		}
	}
}

func tableCommentStatement(dialect, table, comment string) (string, bool) {
	escapedComment := strings.ReplaceAll(comment, "'", "''")
	switch dialect {
	case "postgres":
		escapedTable := strings.ReplaceAll(table, `"`, `""`)
		return fmt.Sprintf(`COMMENT ON TABLE "%s" IS '%s'`, escapedTable, escapedComment), true
	case "mysql":
		escapedTable := strings.ReplaceAll(table, "`", "``")
		return fmt.Sprintf("ALTER TABLE `%s` COMMENT = '%s'", escapedTable, escapedComment), true
	default:
		return "", false
	}
}
