package services

import (
	"context"
	"fmt"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"pudding-resume-backend/config"
)

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
