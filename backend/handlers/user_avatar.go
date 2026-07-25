package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"pudding-resume-backend/config"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"strings"
)

const maxAvatarSize = 2 << 20 // 2 MB

// UploadAvatar handles POST /api/user/avatar (requires auth)
func UploadAvatar(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		if userID == "" {
			respondError(c, http.StatusUnauthorized, "未登录，请先登录")
			return
		}

		// Read the file from the form field "avatar"
		file, header, err := c.Request.FormFile("avatar")
		if err != nil {
			respondError(c, http.StatusBadRequest, "请选择要上传的头像文件")
			return
		}
		defer file.Close()

		// --- Server-side validation ---

		// 1. File size check (< 2MB)
		if header.Size > maxAvatarSize {
			respondError(c, http.StatusBadRequest, "文件大小不能超过 2MB")
			return
		}

		// 2. File signature check. Do not trust the multipart Content-Type:
		// clients can spoof it, so the backend must validate the actual bytes.
		ext, allowed := detectImageType(file)
		if !allowed {
			respondError(c, http.StatusBadRequest, "仅支持 JPG、PNG、WEBP 格式的图片")
			return
		}
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			respondError(c, http.StatusBadRequest, "无法读取上传文件")
			return
		}

		// --- Save the file ---

		// Ensure upload directory exists
		avatarDir := filepath.Join(cfg.UploadDir, "avatars")
		if err := os.MkdirAll(avatarDir, 0755); err != nil {
			respondError(c, http.StatusInternalServerError, "服务器配置错误，无法创建上传目录")
			return
		}

		// Generate a unique filename: UUID + original extension
		newFileName := uuid.New().String() + ext
		destPath := filepath.Join(avatarDir, newFileName)

		// Save the file to disk
		dst, err := os.Create(destPath)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "文件保存失败")
			return
		}
		defer dst.Close()

		written, err := io.Copy(dst, io.LimitReader(file, maxAvatarSize+1))
		if err != nil {
			respondError(c, http.StatusInternalServerError, "文件写入失败")
			return
		}
		if written > maxAvatarSize {
			os.Remove(destPath)
			respondError(c, http.StatusBadRequest, "文件大小不能超过 2MB")
			return
		}

		// --- Delete old avatar file (if any) ---
		var oldUser models.User
		if err := database.DB.Where("id = ?", userID).First(&oldUser).Error; err == nil && oldUser.Avatar != "" {
			oldPath := filepath.Join(cfg.UploadDir, oldUser.Avatar)
			// Best-effort: ignore errors on cleanup
			os.Remove(oldPath)
		}

		// --- Update the user's avatar in the database ---
		avatarRelativePath := filepath.Join("avatars", newFileName)
		if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("avatar", avatarRelativePath).Error; err != nil {
			// If DB update fails, clean up the uploaded file
			os.Remove(destPath)
			respondError(c, http.StatusInternalServerError, "头像信息更新失败，请稍后重试")
			return
		}

		// Return the avatar URL
		c.JSON(http.StatusOK, AvatarResponse{
			AvatarURL: buildAvatarURL(avatarRelativePath),
		})
	}
}

// ChangePassword handles PUT /api/user/password (requires auth)
func DeleteAvatar(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := middleware.GetUserID(c)
		if userID == "" {
			respondError(c, http.StatusUnauthorized, "未登录，请先登录")
			return
		}

		var user models.User
		if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		// Delete file if exists
		if user.Avatar != "" {
			oldPath := filepath.Join(cfg.UploadDir, user.Avatar)
			os.Remove(oldPath) // best-effort, ignore errors
		}

		// Clear avatar field in database
		if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("avatar", "").Error; err != nil {
			respondError(c, http.StatusInternalServerError, "操作失败，请稍后重试")
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "头像已恢复为默认"})
	}
}

// detectImageType reads the first 512 bytes of a file to detect its image type.
// Returns the extension and whether the type is supported.
func detectImageType(file multipart.File) (string, bool) {
	header := make([]byte, 512)
	n, _ := file.Read(header)

	// Reset seek position if possible
	if seeker, ok := file.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	if n == 0 {
		return "", false
	}

	contentType := http.DetectContentType(header[:n])
	switch {
	case strings.HasPrefix(contentType, "image/jpeg"):
		return ".jpg", true
	case strings.HasPrefix(contentType, "image/png"):
		return ".png", true
	case n >= 12 &&
		string(header[0:4]) == "RIFF" &&
		string(header[8:12]) == "WEBP":
		return ".webp", true
	default:
		return "", false
	}
}

// GetPreferences handles GET /api/user/preferences (requires auth)
