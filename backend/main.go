package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/handlers"
	"pudding-resume-backend/mailer"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/redisclient"
	"pudding-resume-backend/services"
)

func main() {
	// Load an optional local .env while preserving values explicitly supplied
	// by the process environment. UTF-8 BOM is accepted for Windows editors.
	if err := loadDotEnv(".env"); err != nil {
		log.Fatalf("Invalid .env file: %v", err)
	}

	// Load configuration
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("Invalid configuration: %v", err)
	}

	// Initialize database
	database.Init(cfg)

	var emailCodes handlers.EmailCodeService
	var emailQueue *services.RedisEmailQueue
	emailWorkerCtx, stopEmailWorkers := context.WithCancel(context.Background())
	defer stopEmailWorkers()
	if cfg.RegistrationEmailCodeEnabled {
		client := redisclient.New(cfg)
		pingCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := redisclient.Ping(pingCtx, client); err != nil {
			cancel()
			log.Fatalf("Failed to connect to Redis: %v", err)
		}
		cancel()
		defer client.Close()

		emailCodeTTL, _ := time.ParseDuration(cfg.EmailCodeTTL)
		emailCodeCooldown, _ := time.ParseDuration(cfg.EmailCodeCooldown)
		registrationTicketTTL, _ := time.ParseDuration(cfg.RegistrationTicketTTL)
		emailQueueLease, _ := time.ParseDuration(cfg.EmailQueueLease)
		emailQueuePoll, _ := time.ParseDuration(cfg.EmailQueuePoll)
		emailQueue = services.NewRedisEmailQueue(client, mailer.NewSMTP(cfg), services.EmailQueueOptions{
			Prefix:      cfg.RedisKeyPrefix,
			Secret:      cfg.EmailCodeSecret,
			Workers:     cfg.EmailQueueWorkers,
			MaxAttempts: cfg.EmailQueueMaxAttempts,
			Lease:       emailQueueLease,
			Poll:        emailQueuePoll,
		})
		emailQueue.Start(emailWorkerCtx)
		emailCodes = services.NewEmailCodeService(client, emailQueue, services.EmailCodeOptions{
			Secret:          cfg.EmailCodeSecret,
			TTL:             emailCodeTTL,
			TicketTTL:       registrationTicketTTL,
			Cooldown:        emailCodeCooldown,
			MaxAttempts:     cfg.EmailCodeMaxAttempts,
			MaxEmailPerHour: cfg.EmailCodeMaxPerEmailHour,
			MaxIPPerHour:    cfg.EmailCodeMaxPerIPHour,
			Prefix:          cfg.RedisKeyPrefix,
		})
	}

	// Ensure upload directories exist
	avatarDir := filepath.Join(cfg.UploadDir, "avatars")
	if err := os.MkdirAll(avatarDir, 0755); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}

	// Ensure fonts directory exists (font files may be lazy-downloaded from CDN at export time)
	if err := os.MkdirAll(cfg.FontsDir, 0755); err != nil {
		log.Fatalf("Failed to create fonts directory: %v", err)
	}

	r := NewRouter(cfg, avatarDir, AuthDependencies{
		EmailCodes: emailCodes,
	})

	// Start server with graceful shutdown
	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	go func() {
		log.Printf("Server starting on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")
	stopEmailWorkers()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	if emailQueue != nil {
		emailQueue.Wait()
	}
	log.Println("Server exited")
}

func loadDotEnv(path string) error {
	content, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	values, err := godotenv.Unmarshal(strings.TrimPrefix(string(content), "\uFEFF"))
	if err != nil {
		return err
	}
	for key, value := range values {
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		if err := os.Setenv(key, value); err != nil {
			return err
		}
	}
	return nil
}

// NewRouter constructs the complete HTTP adapter without starting a server.
// Keeping composition here lets tests exercise routing and middleware independently.
type AuthDependencies struct {
	EmailCodes handlers.EmailCodeService
}

func NewRouter(cfg *config.Config, avatarDir string, dependencies ...AuthDependencies) *gin.Engine {
	var authDependencies AuthDependencies
	if len(dependencies) > 0 {
		authDependencies = dependencies[0]
	}
	// Create Gin router. Request IDs run before logging/recovery so every
	// response can be correlated with upstream and application logs.
	r := gin.New()
	r.Use(middleware.RequestID(), gin.Logger(), gin.Recovery())

	// Set max multipart memory for file uploads (2 MB)
	r.MaxMultipartMemory = 2 * 1024 * 1024

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins(),
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Security headers
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Next()
	})

	// Static file serving for uploaded avatars
	// Maps ./uploads/avatars -> /api/avatars/*
	r.Static("/api/avatars", avatarDir)

	// API routes
	api := r.Group("/api")
	{
		// Health check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})
		api.GET("/config/public", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"registration_email_code_enabled": cfg.RegistrationEmailCodeEnabled,
			})
		})

		// Public routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register(cfg, authDependencies.EmailCodes))
			auth.POST("/register/code", handlers.SendRegistrationCode(cfg, authDependencies.EmailCodes))
			auth.POST("/register/verify", handlers.VerifyRegistrationCode(cfg, authDependencies.EmailCodes))
			auth.POST("/login", handlers.Login(cfg))
			auth.POST("/refresh", handlers.RefreshToken(cfg))
			auth.POST("/logout", handlers.Logout(cfg))
		}

		// Protected routes (require JWT authentication)
		user := api.Group("/user")
		user.Use(middleware.AuthRequired(cfg))
		{
			user.GET("/profile", handlers.GetProfile)
			user.PUT("/profile", handlers.UpdateProfile)
			user.PUT("/password", handlers.ChangePassword)
			user.DELETE("/account", handlers.DeactivateAccount(cfg))
			user.POST("/avatar", middleware.AvatarRateLimit(), handlers.UploadAvatar(cfg))
			user.DELETE("/avatar", handlers.DeleteAvatar(cfg))
			user.GET("/preferences", handlers.GetPreferences)
			user.PUT("/preferences", handlers.UpdatePreferences)
			user.GET("/ai-usage", handlers.GetAIUsage)
		}

		// Resume routes (require JWT authentication)
		resumes := api.Group("/resumes")
		resumes.Use(middleware.AuthRequired(cfg))
		{
			resumes.GET("", handlers.ListResumes)
			resumes.POST("", handlers.CreateResume)
			resumes.GET("/latest", handlers.GetLatestResume)
			resumes.GET("/:id", handlers.GetResumeByID)
			resumes.PUT("/:id", handlers.SaveResumeByID)
			resumes.POST("/:id/copies", handlers.CopyResume)
			resumes.DELETE("/:id", handlers.DeleteResume(cfg))
		}

		// AI routes
		aiRoutes := api.Group("/ai")
		{
			// AuthOptional: supports both logged-in (DB config) and guest (request-body config)
			aiRoutes.POST("/service", middleware.AuthOptional(cfg), handlers.AiService)
			aiRoutes.POST("/translate-resume", middleware.AuthOptional(cfg), handlers.TranslateResumeToEnglish)
			aiRoutes.POST("/diagnose", middleware.AuthOptional(cfg), handlers.DiagnoseResume)
			aiRoutes.POST("/ats-analysis", middleware.AuthOptional(cfg), handlers.AnalyzeATS)
			aiRoutes.POST("/polish", middleware.AuthOptional(cfg), handlers.PolishText)
			aiRoutes.POST("/models", middleware.AuthOptional(cfg), handlers.ListAiModels)

		}

		// Share routes (AuthRequired for settings, AuthOptional for public access)
		resumes.GET("/:id/share", handlers.GetShareSettings)
		resumes.PUT("/:id/share", handlers.UpdateShareSettings)
		api.GET("/resumes/:id/public", middleware.AuthOptional(cfg), handlers.AccessSharedResumeByResumeID(cfg))

		// Export routes (pre-rendered HTML from frontend, optional auth)
		api.POST("/resumes/export/pdf", middleware.AuthOptional(cfg), handlers.ExportResumePDF(cfg))
		api.POST("/resumes/export/png", middleware.AuthOptional(cfg), handlers.ExportResumePNG(cfg))
		api.POST("/resumes/export/pdf/jobs", middleware.AuthOptional(cfg), handlers.StartExportJob(cfg, "pdf"))
		api.POST("/resumes/export/png/jobs", middleware.AuthOptional(cfg), handlers.StartExportJob(cfg, "png"))
		api.GET("/resumes/export/jobs/:id/events", middleware.AuthOptional(cfg), handlers.ExportJobEvents())
		api.GET("/resumes/export/jobs/:id/download", middleware.AuthOptional(cfg), handlers.DownloadExportJob())

		// Font file routes (public)
		api.GET("/font-files/:file", handlers.GetFontFile(cfg))

		// Template routes (public, no auth required)
		templates := api.Group("/templates")
		{
			templates.GET("/styles", handlers.GetStyleLibraries)
			templates.GET("/demo-content", handlers.GetDemoContent)
		}

		// Document settings routes (public, no auth required)
		api.GET("/doc-settings", handlers.GetDocSettings)

		// Admin routes (require JWT + admin role)
		admin := api.Group("/admin")
		admin.Use(middleware.AdminRequired(cfg))
		{
			// Dashboard
			admin.GET("/dashboard", handlers.GetDashboard)

			// User management
			admin.GET("/users", handlers.ListUsers)
			admin.PUT("/users/:id/quota", handlers.UpdateUserQuota)
			admin.PUT("/users/:id/reset-password", handlers.ResetUserPassword(cfg))
			admin.DELETE("/users/:id", handlers.DeleteUser)
			admin.POST("/users/:id/restore", handlers.RestoreUser)
			admin.DELETE("/users/:id/permanent", handlers.PermanentlyDeleteUser(cfg))
			admin.POST("/users/batch-delete", handlers.BatchDeleteUsers)

		}

	}

	return r
}
