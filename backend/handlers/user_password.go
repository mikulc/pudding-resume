package handlers

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"pudding-resume-backend/utils"
)

func ChangePassword(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		respondError(c, http.StatusUnauthorized, "未登录，请先登录")
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请提供旧密码和新密码")
		return
	}

	// Validate new password length
	if len(req.NewPassword) < 6 {
		respondError(c, http.StatusBadRequest, "新密码长度不能少于 6 位")
		return
	}

	// Fetch user with password
	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}

	// Verify old password
	if !utils.CheckPassword(req.OldPassword, user.Password) {
		respondError(c, http.StatusBadRequest, "原密码错误")
		return
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		respondError(c, http.StatusInternalServerError, "服务器内部错误")
		return
	}

	// Update password AND increment token_version (invalidate all existing sessions)
	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]any{
		"password":      hashedPassword,
		"token_version": gorm.Expr("token_version + 1"),
	}).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "密码修改失败，请稍后重试")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "密码修改成功，所有设备已退出登录，请重新登录"})
}

// DeleteAvatar handles DELETE /api/user/avatar (requires auth)
