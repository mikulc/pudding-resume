package services

import (
	"context"
	"fmt"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"pudding-resume-backend/config"
)

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
