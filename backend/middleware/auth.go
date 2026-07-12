package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"pudding-resume-backend/config"
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

// injectUser injects user info from claims into Gin context.
func injectUser(c *gin.Context, claims *utils.Claims) {
	c.Set("userID", claims.UserID)
	c.Set("username", claims.Username)
	c.Set("role", claims.Role)
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

		injectUser(c, claims)
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

		if claims.Role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "需要管理员权限",
			})
			return
		}

		injectUser(c, claims)
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

		injectUser(c, claims)
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
