package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
	"pudding-resume-backend/utils"
)

// extractAuthClaims extracts and validates the JWT token from the Authorization header.
// Returns claims on success, or an empty string reason on failure.
func extractAuthClaims(c *gin.Context, secret string) (*utils.Claims, string) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return nil, "未登录，请先登录"
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, "认证格式错误"
	}

	claims, err := utils.ParseTokenStrict(parts[1], utils.TokenTypeAccess, secret)
	if err != nil {
		return nil, "登录已过期，请重新登录"
	}

	return claims, ""
}

// ExtractAuthClaims is the exported version for use by auth handlers (e.g. Logout).
func ExtractAuthClaims(c *gin.Context, secret string) (*utils.Claims, string) {
	return extractAuthClaims(c, secret)
}

// validateActiveSession makes token revocation immediate. It also rejects
// tokens belonging to soft-deleted users and avoids trusting a stale role from
// a previously issued JWT.
func validateActiveSession(claims *utils.Claims) (*models.User, string) {
	var user models.User
	if err := database.DB.Select("id", "username", "role", "token_version").
		Where("id = ?", claims.UserID).First(&user).Error; err != nil {
		return nil, "用户不存在或账号已停用"
	}
	if user.TokenVersion != claims.TokenVersion {
		return nil, "会话已失效，请重新登录"
	}
	return &user, ""
}

func injectCurrentUser(c *gin.Context, user *models.User) {
	c.Set("userID", user.ID)
	c.Set("username", user.Username)
	c.Set("role", user.Role)
}

// AuthRequired returns a Gin middleware that validates JWT tokens.
// On success, it injects userID, username and role into the request context.
func AuthRequired(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, reason := extractAuthClaims(c, cfg.JWTSecret)
		if claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": reason,
			})
			return
		}

		user, reason := validateActiveSession(claims)
		if user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized", "message": reason,
			})
			return
		}

		injectCurrentUser(c, user)
		c.Next()
	}
}

// AdminRequired returns a Gin middleware that validates JWT tokens
// AND checks that the user has the "admin" role.
func AdminRequired(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, reason := extractAuthClaims(c, cfg.JWTSecret)
		if claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": reason,
			})
			return
		}

		user, reason := validateActiveSession(claims)
		if user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized", "message": reason,
			})
			return
		}

		if user.Role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "需要管理员权限",
			})
			return
		}

		injectCurrentUser(c, user)
		c.Next()
	}
}

// AuthOptional returns a Gin middleware that parses JWT if present,
// but does NOT block the request if no token is provided.
// On success, it injects userID, username and role into the request context.
func AuthOptional(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, _ := extractAuthClaims(c, cfg.JWTSecret)
		if claims == nil {
			c.Next()
			return
		}

		user, _ := validateActiveSession(claims)
		if user != nil {
			injectCurrentUser(c, user)
		}
		c.Next()
	}
}

// GetUserID extracts the authenticated user ID from context.
// Returns empty string if not found (caller should check).
func GetUserID(c *gin.Context) string {
	id, exists := c.Get("userID")
	if !exists {
		return ""
	}
	return id.(string)
}

// GetUsername extracts the authenticated username from context.
func GetUsername(c *gin.Context) string {
	name, exists := c.Get("username")
	if !exists {
		return ""
	}
	return name.(string)
}

// GetRole extracts the authenticated user's role from context.
func GetRole(c *gin.Context) string {
	role, exists := c.Get("role")
	if !exists {
		return ""
	}
	return role.(string)
}
