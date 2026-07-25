package services

import (
	"context"
	"fmt"
	"github.com/chromedp/chromedp"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"pudding-resume-backend/config"
	"time"
)

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
