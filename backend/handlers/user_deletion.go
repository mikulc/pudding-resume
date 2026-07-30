package handlers

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"pudding-resume-backend/utils"
)

type deactivateAccountRequest struct {
	Password string `json:"password" binding:"required"`
}

// DeactivateAccount handles user-initiated account cancellation. The user is
// soft-deleted, all sessions are revoked, and public resume links are disabled.
func DeactivateAccount(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)

		var req deactivateAccountRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "请输入当前密码确认注销")
			return
		}

		var user models.User
		if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
			respondError(c, http.StatusNotFound, "用户不存在")
			return
		}
		if !utils.CheckPassword(req.Password, user.Password) {
			respondError(c, http.StatusUnauthorized, "当前密码错误")
			return
		}

		err := database.DB.Transaction(func(tx *gorm.DB) error {
			// Disable all public links before hiding the account.
			if err := tx.Where("user_id = ?", userID).Delete(&models.ResumeShare{}).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.User{}).Where("id = ?", userID).
				Update("token_version", gorm.Expr("token_version + 1")).Error; err != nil {
				return err
			}
			return tx.Where("id = ?", userID).Delete(&models.User{}).Error
		})
		if err != nil {
			respondError(c, http.StatusInternalServerError, "账号注销失败，请稍后重试")
			return
		}

		clearRefreshTokenCookie(c, cfg.CookieSecure)
		c.JSON(http.StatusOK, gin.H{"message": "账号已注销"})
	}
}

// permanentlyDeleteUser removes all user-owned data in one transaction.
func permanentlyDeleteUser(tx *gorm.DB, userID string) error {
	deleteByUserID := []any{
		&models.ResumeShare{},
		&models.AIUsageLog{},
		&models.UserDailyStats{},
		&models.UserStats{},
		&models.UserQuota{},
		&models.AIServiceConfig{},
		&models.UserPreference{},
	}
	for _, model := range deleteByUserID {
		if err := tx.Unscoped().Where("user_id = ?", userID).Delete(model).Error; err != nil {
			return err
		}
	}
	if err := tx.Unscoped().Where("user_id = ?", userID).Delete(&models.Resume{}).Error; err != nil {
		return err
	}
	return tx.Unscoped().Where("id = ?", userID).Delete(&models.User{}).Error
}

func removeAvatarFile(uploadDir, avatar string) {
	if avatar == "" {
		return
	}
	base, err := filepath.Abs(uploadDir)
	if err != nil {
		return
	}
	target, err := filepath.Abs(filepath.Join(base, avatar))
	if err != nil {
		return
	}
	relative, err := filepath.Rel(base, target)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return
	}
	_ = os.Remove(target)
}

func findUserIncludingDeleted(userID string) (models.User, error) {
	var user models.User
	err := database.DB.Unscoped().Where("id = ?", userID).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return user, gorm.ErrRecordNotFound
	}
	return user, err
}
