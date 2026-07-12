package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"

	"pudding-resume-backend/config"
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

// waitForFonts is a chromedp action that waits for all fonts to load before continuing.
// This is critical when the exported HTML references custom @font-face declarations —
// Chrome needs time to load and apply local font files before rendering.
// timedOut is set to true if the deadline is reached before all fonts are loaded.
func waitForFonts(timedOut *bool, emit ExportProgressFunc) chromedp.ActionFunc {
	return func(ctx context.Context) error {
		emitExportProgress(emit, "fonts", 42, "等待字体加载")
		deadline := time.Now().Add(20 * time.Second)
		lastProgress := 42
		for time.Now().Before(deadline) {
			var allReady bool
			_ = chromedp.Evaluate(
				`(function(){
					if (!document.fonts || document.fonts.size === 0) return true;
					try {
						var ready = true;
						document.fonts.forEach(function(f) {
							if (f.status !== 'loaded') ready = false;
						});
						return ready;
					} catch(e) { return true; }
				})()`,
				&allReady,
			).Do(ctx)
			if allReady {
				emitExportProgress(emit, "fonts", 55, "字体加载完成")
				return nil
			}
			nextProgress := 42 + int(time.Since(deadline.Add(-20*time.Second)).Seconds()/20*12)
			if nextProgress > lastProgress && nextProgress < 55 {
				lastProgress = nextProgress
				emitExportProgress(emit, "fonts", lastProgress, "等待字体加载")
			}
			time.Sleep(250 * time.Millisecond)
		}
		log.Println("[export] font loading timed out, proceeding anyway")
		*timedOut = true
		emitExportProgress(emit, "fonts", 55, "字体加载超时，继续导出")
		return nil
	}
}

// waitForImages returns a chromedp action that waits for all <img> elements
// to finish loading (or times out after 5 seconds).
func waitForImages(emit ExportProgressFunc) chromedp.ActionFunc {
	return func(ctx context.Context) error {
		emitExportProgress(emit, "assets", 34, "等待图片资源")
		deadline := time.Now().Add(5 * time.Second)
		for time.Now().Before(deadline) {
			var allLoaded bool
			_ = chromedp.Evaluate(
				`(function(){
					var imgs = document.querySelectorAll('img');
					if (imgs.length === 0) return true;
					return Array.from(imgs).every(function(img){ return img.complete && img.naturalWidth > 0; });
				})()`,
				&allLoaded,
			).Do(ctx)
			if allLoaded {
				emitExportProgress(emit, "assets", 40, "图片资源加载完成")
				return nil
			}
			time.Sleep(100 * time.Millisecond)
		}
		emitExportProgress(emit, "assets", 40, "图片等待结束")
		return nil
	}
}

// GeneratePNG takes pre-rendered HTML and captures a high-resolution PNG screenshot
// clipped exactly to the resume-paper content area via chromedp.
// fontTimedOut indicates whether custom font loading exceeded the deadline.
func GeneratePNG(result *renderResult, cfg *config.Config) ([]byte, bool, error) {
	return GeneratePNGWithProgress(result, cfg, nil)
}

func GeneratePNGWithProgress(result *renderResult, cfg *config.Config, emit ExportProgressFunc) ([]byte, bool, error) {
	emitExportProgress(emit, "prepare", 8, "创建导出环境")
	ctx, cleanup, pageURL, fontTimedOut, err := prepareExportSession(result, cfg, 2480, 4096,
		chromedp.Flag("force-device-scale-factor", "2"),
	)
	if err != nil {
		return nil, *fontTimedOut, err
	}
	defer cleanup()
	emitExportProgress(emit, "prepare", 24, "导出环境已就绪")

	var pngBuf []byte
	var dims paperDims

	err = chromedp.Run(ctx,
		chromedp.ActionFunc(func(ctx context.Context) error {
			emitExportProgress(emit, "browser", 28, "启动渲染浏览器")
			return nil
		}),
		chromedp.Navigate(pageURL),
		chromedp.ActionFunc(func(ctx context.Context) error {
			emitExportProgress(emit, "page", 32, "加载导出页面")
			return nil
		}),
		chromedp.WaitReady("body"),
		waitForImages(emit),
		waitForFonts(fontTimedOut, emit),
		// Reset body layout so the page content has no extra margin/centering
		chromedp.ActionFunc(func(ctx context.Context) error {
			emitExportProgress(emit, "layout", 62, "校准页面布局")
			var ignored bool
			return chromedp.Evaluate(
				`(function(){
					var s = document.createElement('style');
					s.textContent = 'body{display:block!important;margin:0!important;padding:0!important;background:#fff!important;}';
					document.head.appendChild(s);
					return true;
				})()`, &ignored,
			).Do(ctx)
		}),
		// Measure the combined bounding box of all .resume-paper elements
		chromedp.ActionFunc(func(ctx context.Context) error {
			emitExportProgress(emit, "measure", 70, "测量图片尺寸")
			return chromedp.Evaluate(
				`(function(){
					var papers = document.querySelectorAll('.resume-paper');
					if (papers.length === 0) return {width: 794, height: 1123};
					var minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
					papers.forEach(function(p) {
						var r = p.getBoundingClientRect();
						if (r.x < minX) minX = r.x;
						if (r.y < minY) minY = r.y;
						if (r.x + r.width > maxX) maxX = r.x + r.width;
						if (r.y + r.height > maxY) maxY = r.y + r.height;
					});
					return {width: maxX - minX, height: maxY - minY};
				})()`, &dims,
			).Do(ctx)
		}),
		// Capture a screenshot clipped exactly to the resume-paper area
		chromedp.ActionFunc(func(ctx context.Context) error {
			emitExportProgress(emit, "render", 82, "生成 PNG 图片")
			var err error
			pngBuf, err = page.CaptureScreenshot().
				WithCaptureBeyondViewport(true).
				WithFromSurface(true).
				WithClip(&page.Viewport{
					X:      0,
					Y:      0,
					Width:  dims.Width,
					Height: dims.Height,
					Scale:  2,
				}).
				Do(ctx)
			return err
		}),
	)

	timedOut := *fontTimedOut
	if err != nil {
		return nil, timedOut, fmt.Errorf("chromedp PNG generation failed: %w", err)
	}

	emitExportProgress(emit, "finalize", 96, "PNG 生成完成")
	return pngBuf, timedOut, nil
}

// --- Simplified export API ---
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

// GeneratePDF takes pre-rendered HTML and converts it to PDF via chromedp.
// fontTimedOut indicates whether custom font loading exceeded the deadline.
func GeneratePDF(result *renderResult, cfg *config.Config) ([]byte, bool, error) {
	return GeneratePDFWithProgress(result, cfg, nil)
}

func GeneratePDFWithProgress(result *renderResult, cfg *config.Config, emit ExportProgressFunc) ([]byte, bool, error) {
	emitExportProgress(emit, "prepare", 8, "创建导出环境")
	ctx, cleanup, pageURL, fontTimedOut, err := prepareExportSession(result, cfg, 1240, 1754)
	if err != nil {
		return nil, *fontTimedOut, err
	}
	defer cleanup()
	emitExportProgress(emit, "prepare", 24, "导出环境已就绪")

	var pdfBuf []byte
	var expectedPages int

	err = chromedp.Run(ctx,
		chromedp.ActionFunc(func(ctx context.Context) error {
			emitExportProgress(emit, "browser", 28, "启动渲染浏览器")
			return nil
		}),
		chromedp.Navigate(pageURL),
		chromedp.ActionFunc(func(ctx context.Context) error {
			emitExportProgress(emit, "page", 32, "加载导出页面")
			return nil
		}),
		chromedp.WaitReady("body"),
		waitForImages(emit),
		waitForFonts(fontTimedOut, emit),
		chromedp.ActionFunc(func(ctx context.Context) error {
			emitExportProgress(emit, "measure", 68, "统计 PDF 页数")
			// The frontend has already paginated the resume into paper nodes.
			// Restrict printing to those pages so invisible trailing DOM residue
			// cannot become a blank page in Chrome's print layout.
			return chromedp.Evaluate(
				`(function(){
					var papers = Array.from(document.querySelectorAll('.resume-paper'));
					return papers.filter(function(p) {
						var style = window.getComputedStyle(p);
						var rect = p.getBoundingClientRect();
						return style.display !== 'none' &&
							style.visibility !== 'hidden' &&
							rect.width > 0 &&
							rect.height > 0;
					}).length;
				})()`,
				&expectedPages,
			).Do(ctx)
		}),
		chromedp.ActionFunc(func(ctx context.Context) error {
			emitExportProgress(emit, "render", 82, "生成 PDF 文件")
			printToPDF := page.PrintToPDF().
				WithPrintBackground(true).
				WithPaperWidth(a4WidthInches).
				WithPaperHeight(a4HeightInches).
				WithMarginTop(0).
				WithMarginBottom(0).
				WithMarginLeft(0).
				WithMarginRight(0).
				WithPreferCSSPageSize(true)

			if expectedPages > 0 {
				printToPDF = printToPDF.WithPageRanges(fmt.Sprintf("1-%d", expectedPages))
			}

			var err error
			pdfBuf, _, err = printToPDF.Do(ctx)
			return err
		}),
	)

	timedOut := *fontTimedOut
	if err != nil {
		return nil, timedOut, fmt.Errorf("chromedp PDF generation failed: %w", err)
	}

	emitExportProgress(emit, "finalize", 96, "PDF 生成完成")
	return pdfBuf, timedOut, nil
}

// referencedFontFiles returns the local font files referenced by @font-face
// declarations in the exported HTML.
func referencedFontFiles(html string) []string {
	matches := fontURLPattern.FindAllStringSubmatch(html, -1)
	if len(matches) == 0 {
		return nil
	}

	seen := make(map[string]bool, len(matches))
	files := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		name := path.Base(match[1])
		if name == "." || name == "/" || seen[name] {
			continue
		}
		seen[name] = true
		files = append(files, name)
	}
	return files
}

// copyFontsToDir copies only the .woff2 files referenced by the exported HTML.
// If a font file is missing locally, it attempts to download it from cdnBaseURL
// into srcDir first (lazy cache). If cdnBaseURL is empty, it falls back to an
// error when the local file is missing.
func copyFontsToDir(srcDir, dstDir, html, cdnBaseURL string) error {
	files := referencedFontFiles(html)
	if len(files) == 0 {
		log.Println("[export] no referenced .woff2 font files, skipping font copy")
		return nil
	}

	copied := 0
	for _, file := range files {
		src := filepath.Join(srcDir, file)
		data, err := os.ReadFile(src)
		if err != nil {
			// Local font missing — try CDN download as a one-time cache
			if cdnBaseURL != "" {
				log.Printf("[export] font %s not found locally, downloading from CDN...", file)
				if dlErr := downloadFontFromCDN(cdnBaseURL, srcDir, file); dlErr != nil {
					return fmt.Errorf("download font %s from CDN: %w", file, dlErr)
				}
				data, err = os.ReadFile(src)
				if err != nil {
					return fmt.Errorf("read font file %s after CDN download: %w", src, err)
				}
			} else {
				return fmt.Errorf("read font file %s (no CDN configured): %w", src, err)
			}
		}
		dst := filepath.Join(dstDir, file)
		if err := os.WriteFile(dst, data, 0644); err != nil {
			return fmt.Errorf("write font file %s: %w", dst, err)
		}
		copied++
	}
	log.Printf("[export] copied %d referenced font file(s) from %s to temp dir", copied, srcDir)
	return nil
}

// downloadFontFromCDN fetches a single .woff2 font file from the CDN and saves
// it to destDir for persistent caching. Subsequent exports will find it locally.
func downloadFontFromCDN(cdnBaseURL, destDir, fileName string) error {
	cdURL := fmt.Sprintf("%s/%s", cdnBaseURL, fileName)
	resp, err := http.Get(cdURL)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("CDN returned status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response body: %w", err)
	}

	// Ensure destination directory exists (may have been deleted or never created)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("create font directory %s: %w", destDir, err)
	}

	dest := filepath.Join(destDir, fileName)
	if err := os.WriteFile(dest, data, 0644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	log.Printf("[export] downloaded font %s from CDN (%d bytes), cached to %s", fileName, len(data), dest)
	return nil
}

// prepareExportSession sets up the temp directory with HTML/photo/font files,
// starts a local HTTP file server, and creates a chromedp context ready for
// page navigation. Callers must invoke the returned cleanup function to release
// all resources (Chrome, server, temp files).
func prepareExportSession(result *renderResult, cfg *config.Config, windowWidth, windowHeight int, extraAllocOpts ...chromedp.ExecAllocatorOption) (ctx context.Context, cleanup func(), pageURL string, timedOut *bool, err error) {
	t := false
	timedOut = &t

	tmpDir, err := os.MkdirTemp("", "resume-export-*")
	if err != nil {
		return nil, nil, "", timedOut, fmt.Errorf("failed to create temp dir: %w", err)
	}

	htmlPath := filepath.Join(tmpDir, "index.html")
	if err := os.WriteFile(htmlPath, []byte(result.HTML), 0644); err != nil {
		os.RemoveAll(tmpDir)
		return nil, nil, "", timedOut, fmt.Errorf("failed to write HTML: %w", err)
	}

	if len(result.PhotoData) > 0 {
		photoName := "photo" + result.PhotoExt
		photoPath := filepath.Join(tmpDir, photoName)
		if err := os.WriteFile(photoPath, result.PhotoData, 0644); err != nil {
			os.RemoveAll(tmpDir)
			return nil, nil, "", timedOut, fmt.Errorf("failed to write photo: %w", err)
		}
		log.Printf("[export] wrote photo file: %s (%d bytes)", photoPath, len(result.PhotoData))
	}

	if err := copyFontsToDir(cfg.FontsDir, tmpDir, result.HTML, cfg.FontCDNBaseURL); err != nil {
		log.Printf("[export] warning: failed to copy fonts: %v", err)
	}

	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		os.RemoveAll(tmpDir)
		return nil, nil, "", timedOut, fmt.Errorf("failed to create listener: %w", err)
	}
	fs := http.FileServer(http.Dir(tmpDir))
	ts := &http.Server{Handler: fs}
	go ts.Serve(l)

	pageURL = fmt.Sprintf("http://127.0.0.1:%d/index.html", l.Addr().(*net.TCPAddr).Port)

	allocOpts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.WindowSize(windowWidth, windowHeight),
	)
	allocOpts = append(allocOpts, extraAllocOpts...)
	if cfg.ChromiumPath != "" {
		allocOpts = append(allocOpts, chromedp.ExecPath(cfg.ChromiumPath))
	}

	allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), allocOpts...)
	chromedpCtx, chromedpCancel := chromedp.NewContext(allocCtx)
	ctx, timeoutCancel := context.WithTimeout(chromedpCtx, 60*time.Second)

	cleanup = func() {
		timeoutCancel()
		chromedpCancel()
		allocCancel()
		ts.Close()
		os.RemoveAll(tmpDir)
	}

	return ctx, cleanup, pageURL, timedOut, nil
}
