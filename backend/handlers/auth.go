package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"pudding-resume-backend/services"
	"pudding-resume-backend/utils"
)

// --- Cookie helpers ---

const refreshTokenCookieName = "pudding_refresh_token"

// setRefreshTokenCookie sets the refresh token as an httpOnly cookie.
// The cookie path is restricted to /api/auth so it's only sent on refresh/logout endpoints.
func setRefreshTokenCookie(c *gin.Context, token string, maxAge time.Duration, secure bool) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		refreshTokenCookieName, // name
		token,                  // value
		int(maxAge.Seconds()),  // maxAge in seconds
		"/api/auth",            // path — only sent to auth endpoints
		"",                     // domain — empty = current domain
		secure,                 // secure — only over HTTPS
		true,                   // httpOnly — not accessible by JS
	)
}

// clearRefreshTokenCookie removes the refresh token cookie.
func clearRefreshTokenCookie(c *gin.Context, secure bool) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshTokenCookieName, "", -1, "/api/auth", "", secure, true)
}

// --- Request / Response types ---

type RegisterRequest struct {
	Username           string `json:"username" binding:"required"`
	Email              string `json:"email" binding:"required"`
	Password           string `json:"password" binding:"required"`
	RegistrationTicket string `json:"registration_ticket"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type SendRegistrationCodeRequest struct {
	Email string `json:"email" binding:"required"`
}

type VerifyRegistrationCodeRequest struct {
	Email string `json:"email" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

type VerifyRegistrationCodeResponse struct {
	RegistrationTicket string `json:"registration_ticket"`
	ExpiresIn          int    `json:"expires_in"`
}

type EmailCodeService interface {
	SendRegistrationCode(ctx context.Context, email, ip string) error
	ExchangeRegistrationCode(ctx context.Context, email, code string) (string, error)
	ValidateRegistrationTicket(ctx context.Context, email, ticket string) error
	ConsumeRegistrationTicket(ctx context.Context, email, ticket string) error
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
var verificationCodeRegex = regexp.MustCompile(`^\d{6}$`)

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func registrationConflictMessage(err error) (string, bool) {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
		return "", false
	}
	switch pgErr.ConstraintName {
	case "idx_user_info_email_active", "idx_user_info_email":
		return "该邮箱已被注册", true
	case "idx_user_info_username_active", "idx_user_info_username":
		return "该用户名已被使用", true
	default:
		return "邮箱或用户名已被使用", true
	}
}

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
	setRefreshTokenCookie(c, pair.RefreshToken, refreshExpiry, cfg.CookieSecure)

	// Return access token in response body
	return pair.AccessToken, nil
}

// --- Handlers ---

// Register handles POST /api/auth/register
func Register(cfg *config.Config, emailCodes ...EmailCodeService) gin.HandlerFunc {
	var codeService EmailCodeService
	if len(emailCodes) > 0 {
		codeService = emailCodes[0]
	}
	return func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请填写所有必填字段")
			return
		}
		req.Username = strings.TrimSpace(req.Username)
		req.Email = normalizeEmail(req.Email)

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

		if cfg.RegistrationEmailCodeEnabled {
			if codeService == nil {
				respondError(c, http.StatusServiceUnavailable, "验证码服务暂时不可用，请稍后重试")
				return
			}
			if strings.TrimSpace(req.RegistrationTicket) == "" {
				respondError(c, http.StatusBadRequest, "请先完成邮箱验证")
				return
			}
			if err := codeService.ValidateRegistrationTicket(
				c.Request.Context(), req.Email, req.RegistrationTicket,
			); err != nil {
				if errors.Is(err, services.ErrRegistrationTicketInvalid) {
					respondError(c, http.StatusUnauthorized, "邮箱验证已失效，请重新验证")
				} else {
					log.Printf("validate registration ticket: %v", err)
					respondError(c, http.StatusServiceUnavailable, "验证码服务暂时不可用，请稍后重试")
				}
				return
			}
		}

		// Check if email already exists
		var existingUser models.User
		result := database.DB.Where("LOWER(email) = ?", req.Email).First(&existingUser)
		if result.Error == nil {
			respondError(c, http.StatusConflict, "该邮箱已被注册")
			return
		} else if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		// Check if username already exists
		result = database.DB.Where("username = ?", req.Username).First(&existingUser)
		if result.Error == nil {
			respondError(c, http.StatusConflict, "该用户名已被使用")
			return
		} else if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
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
		var emailVerifiedAt *time.Time
		if cfg.RegistrationEmailCodeEnabled {
			verifiedAt := time.Now()
			emailVerifiedAt = &verifiedAt
		}
		err = database.DB.Transaction(func(tx *gorm.DB) error {
			user = models.User{
				Username:        req.Username,
				Email:           req.Email,
				Password:        hashedPassword,
				EmailVerifiedAt: emailVerifiedAt,
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
			if message, conflict := registrationConflictMessage(err); conflict {
				respondError(c, http.StatusConflict, message)
				return
			}
			respondError(c, http.StatusInternalServerError, "注册失败，请稍后重试")
			return
		}

		if cfg.RegistrationEmailCodeEnabled {
			if err := codeService.ConsumeRegistrationTicket(
				c.Request.Context(), req.Email, req.RegistrationTicket,
			); err != nil {
				log.Printf("consume registration ticket after user creation: %v", err)
			}
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
		req.Email = normalizeEmail(req.Email)

		// Validate email format
		if !emailRegex.MatchString(req.Email) {
			respondError(c, http.StatusBadRequest, "邮箱格式不正确")
			return
		}

		// Find user by email
		var user models.User
		result := database.DB.Where("LOWER(email) = ?", req.Email).First(&user)
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

// VerifyRegistrationCode exchanges a valid one-time code for a short-lived
// registration ticket. Account lookups happen only after this proof exists.
func VerifyRegistrationCode(cfg *config.Config, codeService EmailCodeService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !cfg.RegistrationEmailCodeEnabled {
			respondError(c, http.StatusNotFound, "注册邮箱验证未启用")
			return
		}
		if codeService == nil {
			respondError(c, http.StatusServiceUnavailable, "验证码服务暂时不可用，请稍后重试")
			return
		}
		var req VerifyRegistrationCodeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请输入邮箱和验证码")
			return
		}
		req.Email = normalizeEmail(req.Email)
		req.Code = strings.TrimSpace(req.Code)
		if !emailRegex.MatchString(req.Email) || !verificationCodeRegex.MatchString(req.Code) {
			respondError(c, http.StatusBadRequest, "邮箱或验证码格式不正确")
			return
		}
		ticket, err := codeService.ExchangeRegistrationCode(c.Request.Context(), req.Email, req.Code)
		if err != nil {
			switch {
			case errors.Is(err, services.ErrCodeAttemptsExceeded):
				respondError(c, http.StatusUnauthorized, "验证码错误次数过多，请重新获取")
			case errors.Is(err, services.ErrCodeInvalid):
				respondError(c, http.StatusUnauthorized, "验证码错误或已过期")
			default:
				log.Printf("exchange registration email code: %v", err)
				respondError(c, http.StatusServiceUnavailable, "验证码服务暂时不可用，请稍后重试")
			}
			return
		}
		expiresIn := int(parseExpiration(cfg.RegistrationTicketTTL, 10*time.Minute) / time.Second)
		c.JSON(http.StatusOK, VerifyRegistrationCodeResponse{
			RegistrationTicket: ticket,
			ExpiresIn:          expiresIn,
		})
	}
}

// SendRegistrationCode handles POST /api/auth/register/code.
func SendRegistrationCode(
	cfg *config.Config,
	codeService EmailCodeService,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !cfg.RegistrationEmailCodeEnabled {
			respondError(c, http.StatusNotFound, "注册邮箱验证未启用")
			return
		}
		if codeService == nil {
			respondError(c, http.StatusServiceUnavailable, "验证码服务暂时不可用，请稍后重试")
			return
		}

		var req SendRegistrationCodeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请输入邮箱")
			return
		}
		req.Email = normalizeEmail(req.Email)
		if !emailRegex.MatchString(req.Email) {
			respondError(c, http.StatusBadRequest, "邮箱格式不正确")
			return
		}
		configuredRetryAfter := int(parseExpiration(cfg.EmailCodeCooldown, time.Minute) / time.Second)
		if configuredRetryAfter < 1 {
			configuredRetryAfter = 1
		}

		// Always use the same public response for available and registered addresses.
		var user models.User
		result := database.DB.Select("id").Where("LOWER(email) = ?", req.Email).First(&user)
		if result.Error == nil {
			c.JSON(http.StatusOK, gin.H{
				"message":     "如果该邮箱可以注册，验证码邮件将很快送达",
				"retry_after": configuredRetryAfter,
			})
			return
		}
		if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		if err := codeService.SendRegistrationCode(c.Request.Context(), req.Email, c.ClientIP()); err != nil {
			var rateLimit *services.RateLimitError
			if errors.As(err, &rateLimit) {
				retryAfter := int(rateLimit.RetryAfter.Round(time.Second) / time.Second)
				if retryAfter < 1 {
					retryAfter = 1
				}
				c.Header("Retry-After", strconv.Itoa(retryAfter))
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error":       http.StatusText(http.StatusTooManyRequests),
					"message":     "验证码发送过于频繁，请稍后重试",
					"retry_after": retryAfter,
				})
				return
			}
			log.Printf("send registration email code: %v", err)
			respondError(c, http.StatusServiceUnavailable, "验证码邮件发送失败，请稍后重试")
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":     "如果该邮箱可以注册，验证码邮件将很快送达",
			"retry_after": configuredRetryAfter,
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
			clearRefreshTokenCookie(c, cfg.CookieSecure)
			respondError(c, http.StatusUnauthorized, "刷新令牌无效或已过期，请重新登录")
			return
		}

		// Verify user still exists and token_version matches
		var user models.User
		if err := database.DB.Where("id = ?", claims.UserID).First(&user).Error; err != nil {
			clearRefreshTokenCookie(c, cfg.CookieSecure)
			respondError(c, http.StatusUnauthorized, "用户不存在，请重新登录")
			return
		}

		if user.TokenVersion != claims.TokenVersion {
			clearRefreshTokenCookie(c, cfg.CookieSecure)
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
		setRefreshTokenCookie(c, newRefreshToken, refreshExpiry, cfg.CookieSecure)

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
			clearRefreshTokenCookie(c, cfg.CookieSecure)
			c.JSON(http.StatusOK, gin.H{"message": "已退出登录"})
			return
		}

		// Increment token_version to invalidate all tokens for this user
		if err := database.DB.Model(&models.User{}).
			Where("id = ?", claims.UserID).
			Update("token_version", gorm.Expr("token_version + 1")).Error; err != nil {
			// Log the error but still clear cookie
			clearRefreshTokenCookie(c, cfg.CookieSecure)
			respondError(c, http.StatusInternalServerError, "退出登录失败，请稍后重试")
			return
		}

		clearRefreshTokenCookie(c, cfg.CookieSecure)
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
