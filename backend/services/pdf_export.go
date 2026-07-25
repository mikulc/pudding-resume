package services

import (
	"fmt"
	"pudding-resume-backend/config"
)

// The frontend sends pre-rendered, self-contained HTML (inline styles + base64 images).
// Custom fonts are served from local files (copied to temp dir), so no base64 fonts in HTML.

// ExportHTMLRequest is the request body for the simplified export endpoint.
type ExportHTMLRequest struct {
	HTML     string `json:"html" binding:"required"`
	Filename string `json:"filename"`
	ResumeID string `json:"resume_id"` // optional: for export permission validation on shared resumes
}

// ExportResumePDF takes pre-rendered HTML from the frontend and generates a PDF
// via the chromedp pipeline.
// fontTimedOut indicates whether custom font loading exceeded the deadline.
func ExportResumePDF(req *ExportHTMLRequest, cfg *config.Config) ([]byte, bool, error) {
	return ExportResumePDFWithProgress(req, cfg, nil)
}

func ExportResumePDFWithProgress(req *ExportHTMLRequest, cfg *config.Config, emit ExportProgressFunc) ([]byte, bool, error) {
	if req.HTML == "" {
		return nil, false, fmt.Errorf("HTML content is empty")
	}
	result := &renderResult{HTML: req.HTML}
	pdfBytes, fontTimedOut, err := GeneratePDFWithProgress(result, cfg, emit)
	if err != nil {
		return nil, fontTimedOut, fmt.Errorf("PDF generation failed: %w", err)
	}
	return pdfBytes, fontTimedOut, nil
}

// ExportResumePNG takes pre-rendered HTML from the frontend and generates a PNG
// screenshot via the chromedp pipeline.
// fontTimedOut indicates whether custom font loading exceeded the deadline.
func ExportResumePNG(req *ExportHTMLRequest, cfg *config.Config) ([]byte, bool, error) {
	return ExportResumePNGWithProgress(req, cfg, nil)
}

func ExportResumePNGWithProgress(req *ExportHTMLRequest, cfg *config.Config, emit ExportProgressFunc) ([]byte, bool, error) {
	if req.HTML == "" {
		return nil, false, fmt.Errorf("HTML content is empty")
	}
	result := &renderResult{HTML: req.HTML}
	pngBytes, fontTimedOut, err := GeneratePNGWithProgress(result, cfg, emit)
	if err != nil {
		return nil, fontTimedOut, fmt.Errorf("PNG generation failed: %w", err)
	}
	return pngBytes, fontTimedOut, nil
}
