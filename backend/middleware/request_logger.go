package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/gin-gonic/gin"
)

// RequestLogger emits one structured event per request without logging query
// strings or headers, which may contain credentials.
func RequestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()
		path := c.Request.URL.Path
		c.Next()

		status := c.Writer.Status()
		// Successful health checks and the log viewer's own polling request are
		// operational noise; failures remain visible.
		if status < http.StatusBadRequest && (path == "/api/health" || path == "/api/admin/logs") {
			return
		}
		level := slog.LevelInfo
		if status >= http.StatusInternalServerError {
			level = slog.LevelError
		} else if status >= http.StatusBadRequest {
			level = slog.LevelWarn
		}
		attrs := []any{
			"request_id", GetRequestID(c),
			"method", c.Request.Method,
			"path", path,
			"status", status,
			"latency", time.Since(startedAt),
			"client_ip", c.ClientIP(),
		}
		if len(c.Errors) > 0 {
			attrs = append(attrs, "errors", c.Errors.String())
		}
		logger.Log(c.Request.Context(), level, "http_request", attrs...)
	}
}

// Recovery records panics as structured errors before returning HTTP 500.
func Recovery(logger *slog.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		logger.ErrorContext(c.Request.Context(), "http_panic",
			"request_id", GetRequestID(c),
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"panic", fmt.Sprint(recovered),
			"stack", string(debug.Stack()),
		)
		c.AbortWithStatus(http.StatusInternalServerError)
	})
}
