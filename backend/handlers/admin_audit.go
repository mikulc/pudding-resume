package handlers

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"log"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/models"
	"strconv"
	"strings"
)

func ListAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	action := strings.TrimSpace(c.Query("action"))

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}

	query := database.DB.Model(&models.AdminAuditLog{})
	if action != "" {
		query = query.Where("action = ?", action)
	}

	var total int64
	query.Session(&gorm.Session{}).Count(&total)

	var logs []models.AdminAuditLog
	query.Order("created_at DESC").Offset((page - 1) * size).Limit(size).Find(&logs)

	c.JSON(http.StatusOK, gin.H{"logs": logs, "total": total, "page": page, "size": size})
}

// ============================================================
//  Helpers
// ============================================================

func recordAuditLog(adminID, adminName, action, targetType, targetID, targetName, detail, ip string) {
	entry := models.AdminAuditLog{
		AdminID: adminID, AdminName: adminName,
		Action: action, TargetType: targetType,
		TargetID: targetID, TargetName: targetName,
		Detail: detail, IP: ip,
	}
	if err := database.DB.Create(&entry).Error; err != nil {
		log.Printf("[audit] failed to record audit log: %v", err)
	}
}
