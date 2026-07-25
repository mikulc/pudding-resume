package handlers

import (
	"errors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"unicode/utf8"
)

func GetProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		respondError(c, http.StatusUnauthorized, "未登录，请先登录")
		return
	}

	var user models.User
	result := database.DB.Where("id = ?", userID).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			respondError(c, http.StatusNotFound, "用户不存在")
		} else {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
		}
		return
	}

	c.JSON(http.StatusOK, formatUserProfile(&user))
}

// UpdateProfile handles PUT /api/user/profile (requires auth)
func UpdateProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		respondError(c, http.StatusUnauthorized, "未登录，请先登录")
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请提供用户名")
		return
	}

	// Validate username length
	usernameLen := utf8.RuneCountInString(req.Username)
	if usernameLen < 2 || usernameLen > 10 {
		respondError(c, http.StatusBadRequest, "用户名长度需在 2-10 个字符之间")
		return
	}

	// Check if username is already taken by another user
	var existingUser models.User
	result := database.DB.Where("username = ? AND id != ?", req.Username, userID).First(&existingUser)
	if result.Error == nil {
		respondError(c, http.StatusConflict, "该用户名已被使用")
		return
	} else if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}

	// Update username
	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("username", req.Username).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "更新失败，请稍后重试")
		return
	}

	// Return updated profile
	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}

	c.JSON(http.StatusOK, formatUserProfile(&user))
}

// --- Avatar upload constraints ---
