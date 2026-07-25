package services

import (
	"regexp"
)

// renderResult bundles pre-rendered HTML with optional image bytes that should
// be served next to the HTML while Chrome renders it.
type renderResult struct {
	HTML      string
	PhotoData []byte
	PhotoExt  string
}

// paperDims holds the measured dimensions of resume-paper elements.
type paperDims struct {
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

// ExportProgress describes a server-side export progress update.
type ExportProgress struct {
	Stage    string `json:"stage"`
	Message  string `json:"message"`
	Progress int    `json:"progress"`
}

type ExportProgressFunc func(ExportProgress)

func emitExportProgress(emit ExportProgressFunc, stage string, progress int, message string) {
	if emit == nil {
		return
	}
	emit(ExportProgress{
		Stage:    stage,
		Message:  message,
		Progress: progress,
	})
}

const (
	a4WidthInches  = 210.0 / 25.4
	a4HeightInches = 297.0 / 25.4
)

var fontURLPattern = regexp.MustCompile(`url\(\s*['"]?(?:\./)?([^'")]+\.woff2)['"]?\s*\)`)
