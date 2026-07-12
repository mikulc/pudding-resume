package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/handlers"
	"pudding-resume-backend/middleware"
)

func main() {
	// Load .env file (silently ignore if file doesn't exist — for production env vars)
	_ = godotenv.Load()

	// Load configuration
	cfg := config.Load()

	// Initialize database
	database.Init(cfg)

	// Ensure upload directories exist
	avatarDir := filepath.Join(cfg.UploadDir, "avatars")
	if err := os.MkdirAll(avatarDir, 0755); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}

	// Ensure fonts directory exists (font files may be lazy-downloaded from CDN at export time)
	if err := os.MkdirAll(cfg.FontsDir, 0755); err != nil {
		log.Fatalf("Failed to create fonts directory: %v", err)
	}

	// Create Gin router
	r := gin.Default()

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

		// Public routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register(cfg))
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

			// AuthRequired: public model pool is a shared paid resource
			aiRoutes.GET("/model-pools", middleware.AuthRequired(cfg), handlers.ListPublicModels)
			aiRoutes.GET("/model-pools/:id/balance", middleware.AuthRequired(cfg), handlers.GetModelBalance)
			aiRoutes.POST("/model-pools/balances/refresh", middleware.AuthRequired(cfg), handlers.RefreshPublicModelBalances)
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

		// Public changelog (no auth required)
		api.GET("/changelog", handlers.ListPublishedChangelogs)

		// Admin routes (require JWT + admin role)
		admin := api.Group("/admin")
		admin.Use(middleware.AdminRequired(cfg))
		{
			// Dashboard
			admin.GET("/dashboard", handlers.GetDashboard)

			// User management
			admin.GET("/users", handlers.ListUsers)
			admin.GET("/users/:id", handlers.GetUserDetail)
			admin.PUT("/users/:id/quota", handlers.UpdateUserQuota)
			admin.PUT("/users/:id/role", handlers.UpdateUserRole)
			admin.POST("/users/:id/force-logout", handlers.ForceLogoutUser)
			admin.PUT("/users/:id/reset-password", handlers.ResetUserPassword(cfg))
			admin.DELETE("/users/:id", handlers.DeleteUser)
			admin.POST("/users/batch-delete", handlers.BatchDeleteUsers)

			// AI Model Pool management
			admin.GET("/model-pools", handlers.ListModelPoolsAdmin)
			admin.POST("/model-pools", handlers.CreateModelPool)
			admin.PUT("/model-pools/:id", handlers.UpdateModelPool)
			admin.DELETE("/model-pools/:id", handlers.DeleteModelPool)
			admin.POST("/model-pools/:id/refresh-balance", handlers.GetModelBalance)

			// Changelog management
			admin.GET("/changelogs", handlers.ListChangelogsAdmin)
			admin.POST("/changelogs", handlers.CreateChangelog)
			admin.PUT("/changelogs/:id", handlers.UpdateChangelog)
			admin.DELETE("/changelogs/:id", handlers.DeleteChangelog)

			// Global AI usage stats
			admin.GET("/ai-usage", handlers.GetGlobalAIUsage)
			admin.GET("/ai-usage/users/:id", handlers.GetUserAIUsageDetail)

			// Audit logs
			admin.GET("/audit-logs", handlers.ListAuditLogs)
		}

	}

	// Start server with graceful shutdown
	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	srv := &http.Server{
		Addr:    addr,
		Handler: r,
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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exited")
}
