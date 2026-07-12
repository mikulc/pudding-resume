package handlers

import (
	"net/http"
	"regexp"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"pudding-resume-backend/utils"
)

// --- Cookie helpers ---

const refreshTokenCookieName = "pudding_refresh_token"

// setRefreshTokenCookie sets the refresh token as an httpOnly cookie.
// The cookie path is restricted to /api/auth so it's only sent on refresh/logout endpoints.
func setRefreshTokenCookie(c *gin.Context, token string, maxAge time.Duration) {
	secure := c.Request.TLS != nil // true in production (HTTPS), false in dev (HTTP)
	c.SetCookie(
		refreshTokenCookieName,      // name
		token,                        // value
		int(maxAge.Seconds()),       // maxAge in seconds
		"/api/auth",                  // path — only sent to auth endpoints
		"",                           // domain — empty = current domain
		secure,                       // secure — only over HTTPS
		true,                         // httpOnly — not accessible by JS
	)
	c.SetSameSite(http.SameSiteLaxMode)
}

// clearRefreshTokenCookie removes the refresh token cookie.
func clearRefreshTokenCookie(c *gin.Context) {
	c.SetCookie(refreshTokenCookieName, "", -1, "/api/auth", "", false, true)
}

// --- Request / Response types ---

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

type RefreshResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// --- Helpers ---

func respondError(c *gin.Context, code int, errMsg string) {
	c.JSON(code, ErrorResponse{
		Error:   http.StatusText(code),
		Message: errMsg,
	})
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// parseExpiration parses the expiration duration string, falling back to a default.
func parseExpiration(durationStr string, defaultDuration time.Duration) time.Duration {
	expiration, err := time.ParseDuration(durationStr)
	if err != nil {
		return defaultDuration
	}
	return expiration
}

// generateAndSetTokens generates access+refresh token pair and sets the refresh cookie.
// Returns the access token for the response body.
func generateAndSetTokens(c *gin.Context, user *models.User, cfg *config.Config) (string, error) {
	accessExpiry := parseExpiration(cfg.JWTExpiration, 1*time.Hour)
	refreshExpiry := parseExpiration(cfg.JWTRefreshExpiration, 7*24*time.Hour)

	pair, err := utils.GenerateTokenPair(
		user.ID, user.Username, user.Role,
		user.TokenVersion,
		cfg.JWTSecret,
		accessExpiry,
		refreshExpiry,
	)
	if err != nil {
		return "", err
	}

	// Set refresh token as httpOnly cookie
	setRefreshTokenCookie(c, pair.RefreshToken, refreshExpiry)

	// Return access token in response body
	return pair.AccessToken, nil
}

// --- Handlers ---

// Register handles POST /api/auth/register
func Register(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请填写所有必填字段")
			return
		}

		// Validate username
		usernameLen := utf8.RuneCountInString(req.Username)
		if usernameLen < 2 || usernameLen > 10 {
			respondError(c, http.StatusBadRequest, "用户名长度需在 2-10 个字符之间")
			return
		}

		// Validate email format
		if !emailRegex.MatchString(req.Email) {
			respondError(c, http.StatusBadRequest, "邮箱格式不正确")
			return
		}

		// Validate password length
		if len(req.Password) < 6 {
			respondError(c, http.StatusBadRequest, "密码长度不能少于 6 位")
			return
		}

		// Check if email already exists
		var existingUser models.User
		result := database.DB.Where("email = ?", req.Email).First(&existingUser)
		if result.Error == nil {
			respondError(c, http.StatusConflict, "该邮箱已被注册")
			return
		} else if result.Error != gorm.ErrRecordNotFound {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		// Check if username already exists
		result = database.DB.Where("username = ?", req.Username).First(&existingUser)
		if result.Error == nil {
			respondError(c, http.StatusConflict, "该用户名已被使用")
			return
		} else if result.Error != gorm.ErrRecordNotFound {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		// Hash password
		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		// Create user, preference, quota, and stats in a transaction
		var user models.User
		err = database.DB.Transaction(func(tx *gorm.DB) error {
			user = models.User{
				Username: req.Username,
				Email:    req.Email,
				Password: hashedPassword,
			}
			if err := tx.Create(&user).Error; err != nil {
				return err
			}

			pref := models.UserPreference{
				UserID:    user.ID,
				ThemeMode: "system",
				Language:  "zh-CN",
			}
			if err := tx.Create(&pref).Error; err != nil {
				return err
			}

			quota := models.UserQuota{
				UserID:     user.ID,
				MaxResumes: 10,
			}
			if err := tx.Create(&quota).Error; err != nil {
				return err
			}

			stats := models.UserStats{
				UserID: user.ID,
			}
			if err := tx.Create(&stats).Error; err != nil {
				return err
			}

			return nil
		})
		if err != nil {
			respondError(c, http.StatusInternalServerError, "注册失败，请稍后重试")
			return
		}

		// Generate access + refresh token pair, set cookie
		accessToken, err := generateAndSetTokens(c, &user, cfg)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		c.JSON(http.StatusCreated, AuthResponse{
			Token:    accessToken,
			Username: user.Username,
			Role:     user.Role,
		})
	}
}

// Login handles POST /api/auth/login
func Login(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请填写邮箱和密码")
			return
		}

		// Validate email format
		if !emailRegex.MatchString(req.Email) {
			respondError(c, http.StatusBadRequest, "邮箱格式不正确")
			return
		}

		// Find user by email
		var user models.User
		result := database.DB.Where("email = ?", req.Email).First(&user)
		if result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				respondError(c, http.StatusUnauthorized, "邮箱或密码错误")
			} else {
				respondError(c, http.StatusInternalServerError, "服务器内部错误")
			}
			return
		}

		// Verify password
		if !utils.CheckPassword(req.Password, user.Password) {
			respondError(c, http.StatusUnauthorized, "邮箱或密码错误")
			return
		}

		// Record last login time
		now := time.Now()
		database.DB.Model(&user).Update("last_login_at", now)

		// Generate access + refresh token pair, set cookie
		accessToken, err := generateAndSetTokens(c, &user, cfg)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		c.JSON(http.StatusOK, AuthResponse{
			Token:    accessToken,
			Username: user.Username,
			Role:     user.Role,
		})
	}
}

// RefreshToken handles POST /api/auth/refresh
// Reads the refresh token from the httpOnly cookie, validates it, and issues a new access token.
func RefreshToken(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Read refresh token from cookie
		refreshToken, err := c.Cookie(refreshTokenCookieName)
		if err != nil {
			respondError(c, http.StatusUnauthorized, "未找到刷新令牌，请重新登录")
			return
		}

		// Parse and validate the refresh token (must have token_type=refresh)
		claims, err := utils.ParseTokenStrict(refreshToken, utils.TokenTypeRefresh, cfg.JWTSecret)
		if err != nil {
			clearRefreshTokenCookie(c)
			respondError(c, http.StatusUnauthorized, "刷新令牌无效或已过期，请重新登录")
			return
		}

		// Verify user still exists and token_version matches
		var user models.User
		if err := database.DB.Where("id = ?", claims.UserID).First(&user).Error; err != nil {
			clearRefreshTokenCookie(c)
			respondError(c, http.StatusUnauthorized, "用户不存在，请重新登录")
			return
		}

		if user.TokenVersion != claims.TokenVersion {
			clearRefreshTokenCookie(c)
			respondError(c, http.StatusUnauthorized, "会话已失效，请重新登录")
			return
		}

		// Issue new token pair (rotation: old refresh token is replaced)
		accessExpiry := parseExpiration(cfg.JWTExpiration, 1*time.Hour)
		refreshExpiry := parseExpiration(cfg.JWTRefreshExpiration, 7*24*time.Hour)

		newAccessToken, err := utils.GenerateTokenWithType(
			user.ID, user.Username, user.Role,
			utils.TokenTypeAccess, user.TokenVersion,
			cfg.JWTSecret, accessExpiry,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		newRefreshToken, err := utils.GenerateTokenWithType(
			user.ID, user.Username, user.Role,
			utils.TokenTypeRefresh, user.TokenVersion,
			cfg.JWTSecret, refreshExpiry,
		)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		// Set new refresh cookie
		setRefreshTokenCookie(c, newRefreshToken, refreshExpiry)

		c.JSON(http.StatusOK, RefreshResponse{
			Token:    newAccessToken,
			Username: user.Username,
			Role:     user.Role,
		})
	}
}

// Logout handles POST /api/auth/logout
// Increments the user's token_version, invalidating all existing tokens.
func Logout(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to authenticate the user to increment their token_version.
		// We accept both access tokens and refresh tokens (from cookie).
		claims, _ := extractAuthClaimsFromContext(c, cfg.JWTSecret)

		// If no valid token found, just clear cookie and respond OK
		if claims == nil {
			clearRefreshTokenCookie(c)
			c.JSON(http.StatusOK, gin.H{"message": "已退出登录"})
			return
		}

		// Increment token_version to invalidate all tokens for this user
		if err := database.DB.Model(&models.User{}).
			Where("id = ?", claims.UserID).
			Update("token_version", gorm.Expr("token_version + 1")).Error; err != nil {
			// Log the error but still clear cookie
			clearRefreshTokenCookie(c)
			respondError(c, http.StatusInternalServerError, "退出登录失败，请稍后重试")
			return
		}

		clearRefreshTokenCookie(c)
		c.JSON(http.StatusOK, gin.H{"message": "已退出登录"})
	}
}

// extractAuthClaimsFromContext tries to get claims from Authorization header first,
// then falls back to refresh token cookie. Returns nil if no valid token found.
func extractAuthClaimsFromContext(c *gin.Context, secret string) (*utils.Claims, string) {
	// Try Authorization header first
	claims, _ := middleware.ExtractAuthClaims(c, secret)
	if claims != nil {
		return claims, ""
	}

	// Fall back to refresh token cookie
	refreshToken, err := c.Cookie(refreshTokenCookieName)
	if err != nil {
		return nil, "未登录，请先登录"
	}

	claims, parseErr := utils.ParseToken(refreshToken, secret)
	if parseErr != nil {
		return nil, "登录已过期，请重新登录"
	}

	return claims, ""
}
