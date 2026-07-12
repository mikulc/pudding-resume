package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"pudding-resume-backend/config"
)

// fontFileEntry describes a single face of a custom font.
type fontFileEntry struct {
	File string
}

// fontRegistry maps font families to their allowed .woff2 files.
var fontRegistry = map[string][]fontFileEntry{
	"MiSans": {
		{File: "MiSans-Regular.woff2"},
		{File: "MiSans-Bold.woff2"},
	},
	"Alibaba PuHuiTi 3.0": {
		{File: "AlibabaPuHuiTi-3-55-Regular.woff2"},
		{File: "AlibabaPuHuiTi-3-85-Bold.woff2"},
	},
	"Source Han Serif SC": {
		{File: "SourceHanSerifSC-Regular.woff2"},
		{File: "SourceHanSerifSC-Bold.woff2"},
	},
	"Noto Serif SC": {
		{File: "NotoSerifSC-Regular.woff2"},
		{File: "NotoSerifSC-Bold.woff2"},
	},
	"Noto Sans SC": {
		{File: "NotoSansSC-Regular.woff2"},
		{File: "NotoSansSC-Bold.woff2"},
	},
}

// GetFontFile serves full fallback font files from the backend font directory.
func GetFontFile(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		file := filepath.Base(c.Param("file"))
		if !strings.HasSuffix(file, ".woff2") {
			c.JSON(http.StatusNotFound, gin.H{"message": "font not found"})
			return
		}

		allowed := false
		for _, font := range fontRegistry {
			for _, face := range font {
				if face.File == file {
					allowed = true
					break
				}
			}
			if allowed {
				break
			}
		}
		if !allowed {
			c.JSON(http.StatusNotFound, gin.H{"message": "font not found"})
			return
		}

		path := filepath.Join(cfg.FontsDir, file)
		if _, err := os.Stat(path); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"message": "font not found"})
			return
		}

		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.File(path)
	}
}
