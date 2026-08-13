package database

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
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
		&models.AIUsageLog{},
		&models.Resume{}, &models.ResumeShare{},
		&models.ThemeCategory{}, &models.TemplateCategory{},
		&models.ThemeLibrary{}, &models.TemplateLibrary{},
		&models.ThemeCategoryRelation{}, &models.TemplateCategoryRelation{},
		&models.UserQuota{}, &models.UserStats{}, &models.UserDailyStats{},
	); err != nil {
		log.Fatalf("Failed to auto-migrate database: %v", err)
	}
	migrateLibraryCategoryJSON(DB)

	migrateActiveUserEmailUniqueIndex(DB)
	migrateAIServiceConfigIntoUserPreference(DB)
	dropUnusedLive2DPreferenceColumns(DB)
	dropThemeLibraryDescriptionColumn(DB)
	dropThemeLibraryHighlightsColumn(DB)
	dropThemeLibraryPreviewColorsColumn(DB)
	dropThemeLibraryLegacyCategoryColumn(DB)
	dropTemplateLibraryVersionColumn(DB)
	dropTemplateLibraryClassificationColumns(DB)
	dropTemplateCategoryMetadataColumns(DB)
	dropThemeCategoryMetadataColumns(DB)
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

// dropThemeLibraryHighlightsColumn removes promotional labels that are no
// longer displayed by the theme picker.
func dropThemeLibraryHighlightsColumn(db *gorm.DB) {
	if !db.Migrator().HasColumn(&models.ThemeLibrary{}, "highlights") {
		return
	}
	if err := db.Migrator().DropColumn(&models.ThemeLibrary{}, "highlights"); err != nil {
		log.Fatalf("Failed to drop theme_library.highlights: %v", err)
	}
}

// dropThemeLibraryPreviewColorsColumn removes duplicated colors. Theme previews
// now use the default color registered for their layout ID.
func dropThemeLibraryPreviewColorsColumn(db *gorm.DB) {
	if !db.Migrator().HasColumn(&models.ThemeLibrary{}, "preview_colors") {
		return
	}
	if err := db.Migrator().DropColumn(&models.ThemeLibrary{}, "preview_colors"); err != nil {
		log.Fatalf("Failed to drop theme_library.preview_colors: %v", err)
	}
}

// migrateAIServiceConfigIntoUserPreference moves the active AI settings from
// the retired one-to-one table, then removes the table and its legacy prompt.
func migrateAIServiceConfigIntoUserPreference(db *gorm.DB) {
	const legacyTable = "ai_service_config"
	if !db.Migrator().HasTable(legacyTable) {
		return
	}

	type legacyAIServiceConfig struct {
		UserID models.UUID
		ApiURL string `gorm:"column:api_url"`
		Model  string
	}
	var configs []legacyAIServiceConfig
	if err := db.Table(legacyTable).Select("user_id", "api_url", "model").Scan(&configs).Error; err != nil {
		log.Fatalf("Failed to read legacy AI service configuration: %v", err)
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		for _, config := range configs {
			result := tx.Model(&models.UserPreference{}).
				Where("user_id = ?", config.UserID).
				Updates(map[string]any{
					"ai_service_api_url": config.ApiURL,
					"ai_service_model":   config.Model,
				})
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				if err := tx.Create(&models.UserPreference{
					UserID:          config.UserID,
					AiServiceApiUrl: config.ApiURL,
					AiServiceModel:  config.Model,
				}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		log.Fatalf("Failed to migrate ai_service_config into user_preference: %v", err)
	}
	if err := db.Migrator().DropTable(legacyTable); err != nil {
		log.Fatalf("Failed to drop migrated ai_service_config table: %v", err)
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

// migrateLibraryCategoryJSON normalizes the former JSON category arrays into
// managed category and relation tables. It is idempotent and drops the legacy
// columns only after all rows have been migrated successfully.
func migrateLibraryCategoryJSON(db *gorm.DB) {
	type legacyCategoryRow struct {
		ID         models.UUID
		Categories datatypes.JSON
	}

	migrate := func(
		table string,
		categoryModel any,
		createCategory func(*gorm.DB, string, int) (models.UUID, error),
		createRelation func(*gorm.DB, models.UUID, models.UUID, int) error,
	) error {
		if !db.Migrator().HasColumn(table, "categories") {
			return nil
		}
		var rows []legacyCategoryRow
		if err := db.Table(table).Select("id", "categories").Scan(&rows).Error; err != nil {
			return err
		}
		if err := db.Transaction(func(tx *gorm.DB) error {
			for _, row := range rows {
				var names []string
				if len(row.Categories) == 0 || string(row.Categories) == "null" {
					continue
				}
				if err := json.Unmarshal(row.Categories, &names); err != nil {
					return fmt.Errorf("decode %s categories for %s: %w", table, row.ID, err)
				}
				seen := map[string]struct{}{}
				for index, name := range names {
					name = strings.TrimSpace(name)
					if name == "" {
						continue
					}
					if _, exists := seen[name]; exists {
						continue
					}
					seen[name] = struct{}{}
					categoryID, err := createCategory(tx, name, index)
					if err != nil {
						return err
					}
					if err := createRelation(tx, row.ID, categoryID, index); err != nil {
						return err
					}
				}
			}
			return nil
		}); err != nil {
			return err
		}
		return db.Migrator().DropColumn(categoryModel, "categories")
	}

	if err := migrate(
		"theme_library",
		&models.ThemeLibrary{},
		func(tx *gorm.DB, name string, order int) (models.UUID, error) {
			if name == "单栏" || name == "双栏" {
				return "", nil
			}
			category := models.ThemeCategory{Name: name}
			err := tx.Where("name = ?", name).First(&category).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				hasCode := tx.Migrator().HasColumn("theme_category", "code")
				hasType := tx.Migrator().HasColumn("theme_category", "type")
				if hasCode || hasType {
					now := time.Now()
					values := map[string]any{
						"id": models.NewUUID(), "name": name,
						"status": "enabled", "sort_order": order,
						"created_at": now, "updated_at": now,
					}
					if hasCode {
						values["code"] = normalizedCategoryCode("theme", name)
					}
					if hasType {
						categoryType := "style"
						if name == "图标" {
							categoryType = "feature"
						}
						values["type"] = categoryType
					}
					err = tx.Table("theme_category").Create(values).Error
					if err == nil {
						err = tx.Where("name = ?", name).First(&category).Error
					}
				} else {
					category = models.ThemeCategory{Name: name, Status: "enabled", SortOrder: order}
					err = tx.Create(&category).Error
				}
			}
			return category.ID, err
		},
		func(tx *gorm.DB, ownerID, categoryID models.UUID, order int) error {
			if categoryID == "" {
				return nil
			}
			relation := models.ThemeCategoryRelation{ThemeID: ownerID, CategoryID: categoryID, SortOrder: order}
			return tx.Where("theme_id = ? AND category_id = ?", ownerID, categoryID).FirstOrCreate(&relation).Error
		},
	); err != nil {
		log.Fatalf("Failed to migrate theme categories: %v", err)
	}

	if err := migrate(
		"template_library",
		&models.TemplateLibrary{},
		func(tx *gorm.DB, name string, order int) (models.UUID, error) {
			category := models.TemplateCategory{Name: name}
			err := tx.Where("name = ?", name).First(&category).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				hasCode := tx.Migrator().HasColumn("template_category", "code")
				hasType := tx.Migrator().HasColumn("template_category", "type")
				if hasCode || hasType {
					// Older schemas still enforce the retired columns until the
					// legacy JSON categories have been migrated into relations.
					now := time.Now()
					values := map[string]any{
						"id": models.NewUUID(), "name": name,
						"status": "enabled", "sort_order": order,
						"created_at": now, "updated_at": now,
					}
					if hasCode {
						values["code"] = normalizedCategoryCode("template", name)
					}
					if hasType {
						values["type"] = "position"
					}
					err = tx.Table("template_category").Create(values).Error
					if err == nil {
						err = tx.Where("name = ?", name).First(&category).Error
					}
				} else {
					category = models.TemplateCategory{Name: name, Status: "enabled", SortOrder: order}
					err = tx.Create(&category).Error
				}
			}
			return category.ID, err
		},
		func(tx *gorm.DB, ownerID, categoryID models.UUID, order int) error {
			relation := models.TemplateCategoryRelation{TemplateID: ownerID, CategoryID: categoryID, SortOrder: order}
			return tx.Where("template_id = ? AND category_id = ?", ownerID, categoryID).FirstOrCreate(&relation).Error
		},
	); err != nil {
		log.Fatalf("Failed to migrate template categories: %v", err)
	}
}

func normalizedCategoryCode(prefix, name string) string {
	sum := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(name))))
	return fmt.Sprintf("%s-%x", prefix, sum[:8])
}

// dropTemplateLibraryVersionColumn removes the retired template version field.
func dropTemplateLibraryVersionColumn(db *gorm.DB) {
	if !db.Migrator().HasColumn(&models.TemplateLibrary{}, "version") {
		return
	}
	if err := db.Migrator().DropColumn(&models.TemplateLibrary{}, "version"); err != nil {
		log.Fatalf("Failed to drop template_library.version: %v", err)
	}
}

// dropTemplateLibraryClassificationColumns removes metadata now represented by
// managed template categories. Highlights were never rendered by the client.
func dropTemplateLibraryClassificationColumns(db *gorm.DB) {
	for _, column := range []string{"industry", "highlights"} {
		if !db.Migrator().HasColumn(&models.TemplateLibrary{}, column) {
			continue
		}
		if err := db.Migrator().DropColumn(&models.TemplateLibrary{}, column); err != nil {
			log.Fatalf("Failed to drop template_library.%s: %v", column, err)
		}
	}
}

// dropTemplateCategoryMetadataColumns removes unused machine-code and type
// metadata. Template relations use category UUIDs and the UI uses category names.
func dropTemplateCategoryMetadataColumns(db *gorm.DB) {
	for _, column := range []string{"code", "type"} {
		if !db.Migrator().HasColumn(&models.TemplateCategory{}, column) {
			continue
		}
		if err := db.Migrator().DropColumn(&models.TemplateCategory{}, column); err != nil {
			log.Fatalf("Failed to drop template_category.%s: %v", column, err)
		}
	}
}

// dropThemeCategoryMetadataColumns removes unused code and type metadata.
// Theme relations use category UUIDs and the client consumes category names.
func dropThemeCategoryMetadataColumns(db *gorm.DB) {
	for _, column := range []string{"code", "type"} {
		if !db.Migrator().HasColumn(&models.ThemeCategory{}, column) {
			continue
		}
		if err := db.Migrator().DropColumn(&models.ThemeCategory{}, column); err != nil {
			log.Fatalf("Failed to drop theme_category.%s: %v", column, err)
		}
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
	seedTemplateCategories()
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
		"ai_usage_logs":     "AI 用量调用日志表",
		"user_resumes":      "用户简历表",
		"theme_library":     "简历主题库表",
		"template_library":  "简历内容模板库表",
		"theme_category":    "简历主题分类表",
		"template_category": "简历模板分类表",
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
