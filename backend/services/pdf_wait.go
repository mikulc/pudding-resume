package services

import (
	"context"
	"github.com/chromedp/chromedp"
	"log"
	"time"
)

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
