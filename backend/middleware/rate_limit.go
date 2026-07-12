package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// avatarRateLimiter is a simple in-memory rate limiter for avatar uploads.
// Keyed by userID, it tracks the timestamps of recent uploads.
type avatarRateLimiter struct {
	mu       sync.Mutex
	records  map[string][]time.Time
	maxReqs  int
	interval time.Duration
}

var avatarLimiter = &avatarRateLimiter{
	records:  make(map[string][]time.Time),
	maxReqs:  5,             // max 5 avatar uploads
	interval: 1 * time.Hour, // per hour
}

// AvatarRateLimit returns a Gin middleware that rate-limits avatar uploads
// per authenticated user. Limits: 5 requests per hour.
func AvatarRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := GetUserID(c)
		if userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "未登录，请先登录",
			})
			return
		}

		avatarLimiter.mu.Lock()
		now := time.Now()
		window := now.Add(-avatarLimiter.interval)

		// Clean expired records for this user
		records := avatarLimiter.records[userID]
		valid := records[:0]
		for _, t := range records {
			if t.After(window) {
				valid = append(valid, t)
			}
		}

		if len(valid) >= avatarLimiter.maxReqs {
			avatarLimiter.records[userID] = valid
			avatarLimiter.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"message": "头像上传过于频繁，请稍后再试",
			})
			return
		}

		valid = append(valid, now)
		avatarLimiter.records[userID] = valid
		avatarLimiter.mu.Unlock()

		c.Next()
	}
}
