package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"pudding-resume-backend/services"
)

// GetAdminLogs returns a filtered snapshot of recent process-local backend logs.
func GetAdminLogs(store *services.LogStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "200"))
		after, _ := strconv.ParseUint(c.Query("after"), 10, 64)
		level := strings.ToLower(strings.TrimSpace(c.Query("level")))
		source := strings.ToLower(strings.TrimSpace(c.Query("source")))
		if !oneOf(level, "", "debug", "info", "warn", "error") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "无效的日志级别"})
			return
		}
		if !oneOf(source, "", "app", "http") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "无效的日志来源"})
			return
		}

		c.JSON(http.StatusOK, store.Snapshot(services.LogFilter{
			Limit: limit, After: after, Level: level, Source: source, Query: c.Query("query"),
		}))
	}
}

func oneOf(value string, allowed ...string) bool {
	for _, item := range allowed {
		if value == item {
			return true
		}
	}
	return false
}
