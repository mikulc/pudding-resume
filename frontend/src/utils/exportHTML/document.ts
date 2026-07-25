import i18n from '../i18n';

/**
 * 包装为完整 HTML 文档（导出供多页合并使用）
 *
 * @param bodyHTML - 自包含的 body HTML
 * @param documentStyles - 布局/主题等样式
 * @param fontCSS - @font-face 声明（字体文件由后端本地提供，使用相对路径引用），确保后端 Chrome 可渲染自定义字体
 */
export function wrapAsDocument(bodyHTML: string, documentStyles: string, fontCSS?: string): string {
  const lang = i18n.language || 'zh-CN';
  const title = i18n.t('export.documentTitle', { ns: 'resume' });
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  /* ============================================================
     @font-face declarations — font files served locally by backend
     ============================================================ */
  ${fontCSS || '/* No custom fonts */'}

  /* ============================================================
     Reset & Base
     ============================================================ */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  /* ============================================================
     Print Page Definition — MUST precede all other rules.
     Without an explicit @page { size: A4 }, Chrome's
     preferCSSPageSize mode may produce a single oversized page
     instead of splitting content across A4 pages.
     ============================================================ */
  @page {
    size: A4;
    margin: 0;
  }

  body {
    /* Elements already receive precise font-family values via inlineComputedStyle.
       This fallback avoids overriding element-level font settings. */
    font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    position: relative;
    margin: 0;
    padding: 0;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  /* ============================================================
     A4 Paper Stack
     ============================================================ */
  .resume-paper {
    width: 210mm;
    min-height: 297mm;
    background: #ffffff;
    color: #111827;
    line-height: 1.6;
    overflow-wrap: break-word;
    flex-shrink: 0;
    overflow: hidden;
    box-sizing: border-box;
    position: relative;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  .resume-paper * {
    overflow-wrap: break-word;
  }

  .resume-paper [data-page-atom]:not([data-page-splittable="true"]) {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* PNG continuous mode: remove paper-level clipping and fixed height
     so content flows naturally when papers are stacked vertically. */
  .resume-paper.png-continuous-paper {
    display: block !important;
    height: auto !important;
    max-height: none !important;
    min-height: 0 !important;
    overflow: visible !important;
    margin: 0 !important;
    box-shadow: none !important;
    float: none !important;
    clear: none !important;
    page-break-after: auto !important;
    break-after: auto !important;
    flex-shrink: initial !important;
  }

  /* Print pagination */
  @media print {
    body {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }
    .resume-paper {
      page-break-after: always;
      page-break-inside: avoid;
    }
    .resume-paper:last-child {
      page-break-after: auto;
    }
    .resume-paper.png-continuous-paper {
      page-break-after: auto !important;
    }
  }

  /* ============================================================
     ${'Bold & Italic'}
     ============================================================ */
  strong { font-weight: 700; }
  em { font-style: italic; }

  /* ============================================================
     Layout-specific & theme styles from frontend
     ============================================================ */
  ${documentStyles}

  /* ============================================================
     Tailwind utility fallbacks for PDF rendering
     ============================================================ */
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .font-normal { font-weight: 400; }
  .text-gray-900 { color: #111827; }
  .text-gray-700 { color: #374151; }
  .text-gray-600 { color: #4B5563; }
  .text-gray-500 { color: #6B7280; }
  .text-gray-400 { color: #9CA3AF; }
  .text-gray-300 { color: #D1D5DB; }
  .text-blue-500 { color: #3B82F6; }
  .text-blue-600 { color: #2563EB; }
  .text-white { color: #ffffff; }
  .text-black { color: #000000; }
  .bg-gray-100 { background-color: #F3F4F6; }
  .bg-white { background-color: #ffffff; }
  .bg-blue-50 { background-color: #EFF6FF; }
  .bg-blue-100 { background-color: #DBEAFE; }
  .bg-green-50 { background-color: #F0FDF4; }
  .bg-green-100 { background-color: #DCFCE7; }
  .bg-orange-50 { background-color: #FFF7ED; }
  .bg-purple-50 { background-color: #FAF5FF; }
  .border-gray-200 { border-color: #E5E7EB; }
  .rounded-md { border-radius: 6px; }
  .rounded-lg { border-radius: 8px; }
  .rounded-full { border-radius: 9999px; }
  .object-cover { object-fit: cover; }
  .overflow-hidden { overflow: hidden; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .flex-row { flex-direction: row; }
  .flex-wrap { flex-wrap: wrap; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .items-baseline { align-items: baseline; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .flex-1 { flex: 1 1 0%; }
  .flex-shrink-0 { flex-shrink: 0; }
  .shrink-0 { flex-shrink: 0; }
  .space-y-1 > * + * { margin-top: 4px; }
  .space-y-2 > * + * { margin-top: 8px; }
  .gap-1 { gap: 4px; }
  .gap-1\\.5 { gap: 6px; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .gap-4 { gap: 16px; }
  .gap-x-4 { column-gap: 16px; }
  .gap-y-1 { row-gap: 4px; }
  .w-4 { width: 16px; }
  .h-4 { height: 16px; }
  .w-8 { height: 8px; }
  .h-8 { height: 32px; }
  .w-full { width: 100%; }
  .h-full { height: 100%; }
  .list-none { list-style-type: none; }
  .break-words { overflow-wrap: break-word; }
  .whitespace-pre-wrap { white-space: pre-wrap; }
  .select-none { user-select: none; }
  .select-text { user-select: text; }

  /* Default SVG icon styles */
  svg {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }
</style>
</head>
<body>
${bodyHTML}
</body>
</html>`;
}
