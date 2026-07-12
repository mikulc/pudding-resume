import type { WatermarkSettings } from '../types/resume';
import i18n from './i18n';

/**
 * DOM 提取工具：将浏览器渲染后的简历预览 DOM 提取为自包含 HTML 字符串，
 * 直接发给后端 Chrome headless 生成 PDF。
 *
 * 核心策略：
 * 1. 遍历 DOM 树，用 getComputedStyle() 获取每个元素的实际样式，内联为 style 属性
 *    这解决了 Tailwind CSS utility class 在独立 HTML 中无法渲染的问题
 * 2. 将 <img> 标签的图片转为 base64 data URL 内嵌，避免 Chrome 跨域问题
 * 3. 包装为完整 HTML 文档（含 reset CSS、字体声明等）
 *    字体文件由后端本地提供，@font-face 使用相对路径 ./font.woff2 引用
 */

// 需要从 computed styles 中提取的 CSS 属性列表
// 只提取影响视觉布局和外观的属性，忽略交互相关属性
const RELEVANT_CSS_PROPS = [
  // 文字样式
  'color',
  'font-size',
  'font-weight',
  'font-style',
  'font-family',
  'letter-spacing',
  'text-decoration',
  'text-transform',
  'text-align',
  'text-indent',
  'text-overflow',
  'vertical-align',
  'line-height',
  'white-space',
  'word-break',
  'overflow-wrap',
  'word-wrap',

  // 背景
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',

  // 布局
  'display',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'align-items',
  'align-content',
  'align-self',
  'justify-content',
  'justify-items',
  'justify-self',
  'gap',
  'row-gap',
  'column-gap',
  'order',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',

  // 盒模型
  'width',
  'max-width',
  'min-width',
  'height',
  'max-height',
  'min-height',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'box-sizing',

  // 边框
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',

  // 定位
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',

  // 视觉效果
  'opacity',
  'visibility',
  'overflow',
  'overflow-x',
  'overflow-y',
  'transform',
  'transform-origin',
  'box-shadow',

  // 缩放（前端预览通过 zoom 控制字体缩放层级）
  'zoom',

  // 表格
  'border-collapse',
  'border-spacing',
  'table-layout',
];

// 需要跳过的元素标签（不会渲染在 PDF 中的）
// 需要跳过内联样式的属性名（这些是前端编辑交互用的）
const SKIP_STYLE_PROPS = new Set([
  'cursor',
  'pointer-events',
  'user-select',
  'outline',
  'outline-color',
  'outline-style',
  'outline-width',
  'transition',
  'transition-delay',
  'transition-duration',
  'transition-property',
  'transition-timing-function',
  'animation',
  'animation-delay',
  'animation-direction',
  'animation-duration',
  'animation-fill-mode',
  'animation-iteration-count',
  'animation-name',
  'animation-play-state',
  'animation-timing-function',
  'will-change',
  'scroll-behavior',
]);

/**
 * 将元素的 computed styles 中相关属性内联为 style 属性
 */
function inlineComputedStyle(cloneEl: HTMLElement, origEl: HTMLElement): void {
  const computed = window.getComputedStyle(origEl);
  const styles: string[] = [];

  for (const prop of RELEVANT_CSS_PROPS) {
    if (SKIP_STYLE_PROPS.has(prop)) continue;
    const val = computed.getPropertyValue(prop);
    // 跳过默认值和空值
    // Skip truly default values. Note: we intentionally do NOT skip "auto"
    // because it is a meaningful value for properties like overflow, margin,
    // flex-basis, etc. Only skip "initial", "none", "normal" which are true
    // computed defaults for non-layout-critical properties.
    if (!val || val === 'initial' || val === 'none' || val === 'normal') {
      continue;
    }
    // Use !important to ensure inline styles beat any !important class rules
    // from layout CSS (e.g., elegant layout's "background-color: transparent !important"
    // would otherwise override our computed background color due to cascade rules:
    // Author !important > Author normal, regardless of specificity)
    styles.push(`${prop}: ${val} !important`);
  }

  if (styles.length > 0) {
    cloneEl.setAttribute('style', styles.join('; '));
  }
}

/**
 * 将 <img> 标签的 src 转为 base64 data URL
 * 跳过已经是 data: URL 的、SVG 内联的、以及无法加载的图片
 */
async function convertImagesToBase64(root: HTMLElement): Promise<void> {
  const images = root.querySelectorAll('img');
  const promises: Promise<void>[] = [];

  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;

    promises.push(
      new Promise<void>((resolve) => {
        // 尝试加载图片并转为 base64
        const canvas = document.createElement('canvas');
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';

        tempImg.onload = () => {
          try {
            canvas.width = tempImg.naturalWidth;
            canvas.height = tempImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(tempImg, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              img.setAttribute('src', dataUrl);
            }
          } catch {
            // Canvas 污染或转换失败，保留原始 src
          }
          resolve();
        };

        tempImg.onerror = () => {
          // 无法加载，保留原始 src（Chrome 可能仍可访问）
          resolve();
        };

        tempImg.src = src;
      }),
    );
  });

  await Promise.all(promises);
}

/**
 * 移除 AI 诊断标记：将 .diagnosis-mark 元素替换为其内部内容，保留文字但去除视觉标记
 */
function removeDiagnosisMarks(root: HTMLElement): void {
  const marks = root.querySelectorAll<HTMLElement>('.diagnosis-mark');
  // 使用 Array.from 创建静态快照，避免在遍历中修改 DOM 导致问题
  const markArray = Array.from(marks);
  for (const mark of markArray) {
    const parent = mark.parentNode;
    if (!parent) continue;
    // 将 .diagnosis-mark 的子节点移动到其父节点中（替换自身）
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  }
}

function removeExportExcluded(root: HTMLElement): void {
  root.querySelectorAll('[data-export-exclude]').forEach((el) => el.remove());
}

/**
 * 移除交互相关的 HTML 属性
 */
function removeInteractiveAttributes(root: HTMLElement): void {
  const allElements = root.querySelectorAll('*');
  const attrNames = [
    'contenteditable',
    'data-section',      // 前端分页标记，PDF 不需要
    'data-section-header',
    'data-entry-index',
    'data-field',
    'data-entry-id',
    'tabindex',
    'draggable',
  ];

  // 处理根元素
  for (const attr of attrNames) {
    root.removeAttribute(attr);
  }

  // 处理所有子元素
  allElements.forEach((el) => {
    for (const attr of attrNames) {
      el.removeAttribute(attr);
    }
    // 移除所有以 data-v- 开头的属性（Vue/preact 无用）
    Array.from(el.attributes).forEach((a) => {
      if (a.name.startsWith('data-v-') || a.name === 'aria-hidden') {
        el.removeAttribute(a.name);
      }
    });
  });
}

/**
 * 将元素和其所有子元素的 computed style 内联
 */
function inlineAllStyles(root: HTMLElement): void {
  // 需要一个原始 DOM 引用以便获取 computed styles
  // 使用 document.querySelector 找到对应元素
  const allElements = root.querySelectorAll('*');
  const rootId = '__export_root__';

  // 给根元素打标记
  const originalRoot = document.getElementById(rootId);
  if (!originalRoot) return;

  // 内联根元素
  inlineComputedStyle(root, originalRoot);

  // 内联所有子元素
  const origElements = originalRoot.querySelectorAll('*');
  allElements.forEach((cloneEl, i) => {
    if (i < origElements.length && cloneEl instanceof HTMLElement) {
      inlineComputedStyle(cloneEl as HTMLElement, origElements[i] as HTMLElement);
    }
  });
}

/**
 * 处理单个 DOM 元素：深克隆 → 内联 computed styles → 图片 base64 → 清理交互属性。
 * 返回处理后的元素 outerHTML，不包裹文档。
 * 用于多页导出的逐页提取场景。
 */
function setImportantStyle(el: HTMLElement, property: string, value: string): void {
  el.style.setProperty(property, value, 'important');
}

/**
 * Keep fields that are explicitly marked as a single-line export value stable
 * across desktop and mobile browsers. The preview may be scaled to fit a phone,
 * but that responsive presentation must not become export line wrapping or
 * truncation. A field remains intact and its flex container wraps the whole
 * field when there is not enough room.
 */
function applyExportNoWrap(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-export-nowrap="true"]').forEach((el) => {
    setImportantStyle(el, 'white-space', 'nowrap');
    setImportantStyle(el, 'overflow', 'visible');
    setImportantStyle(el, 'text-overflow', 'clip');
    setImportantStyle(el, 'overflow-wrap', 'normal');
    setImportantStyle(el, 'word-break', 'normal');
    setImportantStyle(el, 'min-width', 'max-content');
    setImportantStyle(el, 'flex-shrink', '0');

    const item = el.parentElement;
    // Icon-mode fields wrap the value in a flex item. Prevent that wrapper
    // from shrinking as well, so the parent flex-wrap layout moves the entire
    // icon + value pair instead of clipping only the text.
    if (item?.classList.contains('min-w-0') && item.querySelector(':scope > svg')) {
      setImportantStyle(item, 'min-width', 'max-content');
      setImportantStyle(item, 'flex-shrink', '0');
    }
  });
}

/**
 * Computed styles contain used pixel heights. Inlining those heights freezes a
 * one-line preview row even when backend Chrome needs a little more room for
 * the same font. Let export title rows grow, and wrap compact-layout fields as
 * complete units instead of breaking words inside a fixed-height row.
 */
function applyExportTitleRowLayout(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.entry-title-row').forEach((row) => {
    setImportantStyle(row, 'height', 'auto');
    setImportantStyle(row, 'max-height', 'none');
    setImportantStyle(row, 'overflow', 'visible');

    row.querySelectorAll<HTMLElement>(':scope > .min-w-0').forEach((content) => {
      setImportantStyle(content, 'width', 'auto');
      setImportantStyle(content, 'height', 'auto');
      setImportantStyle(content, 'max-width', 'none');
      setImportantStyle(content, 'max-height', 'none');
      setImportantStyle(content, 'flex', '1 1 0%');
      setImportantStyle(content, 'flex-wrap', 'wrap');
      setImportantStyle(content, 'overflow', 'visible');

      content.querySelectorAll<HTMLElement>(':scope > span').forEach((field) => {
        setImportantStyle(field, 'width', 'auto');
        setImportantStyle(field, 'height', 'auto');
        setImportantStyle(field, 'max-width', 'none');
        setImportantStyle(field, 'white-space', 'nowrap');
        setImportantStyle(field, 'overflow-wrap', 'normal');
        setImportantStyle(field, 'word-break', 'normal');
        setImportantStyle(field, 'flex-shrink', '0');
      });
    });
  });
}

/** Keep decorative section labels (for example the teal ribbon) on one line. */
function applyExportSectionHeaderLayout(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.section-header > span:last-child').forEach((title) => {
    setImportantStyle(title, 'width', 'max-content');
    setImportantStyle(title, 'max-width', 'none');
    setImportantStyle(title, 'white-space', 'nowrap');
    setImportantStyle(title, 'overflow-wrap', 'normal');
    setImportantStyle(title, 'word-break', 'keep-all');
    setImportantStyle(title, 'flex-shrink', '0');
  });
}

function applyExportLayoutStability(root: HTMLElement): void {
  applyExportNoWrap(root);
  applyExportTitleRowLayout(root);
  applyExportSectionHeaderLayout(root);
}

function createContinuousWatermarkOverlay(settings: WatermarkSettings): HTMLElement | null {
  if (!settings.enabled || !settings.content.trim()) {
    return null;
  }

  const densityMap = {
    low: { cols: 3, rowHeight: '148.5mm', rows: 16 },
    medium: { cols: 4, rowHeight: '99mm', rows: 24 },
    high: { cols: 5, rowHeight: '59.4mm', rows: 40 },
  };
  const { cols, rowHeight, rows } = densityMap[settings.density];
  const overlay = document.createElement('div');

  overlay.setAttribute('data-watermark-overlay', 'true');
  overlay.setAttribute('style', `
    position: absolute !important;
    inset: 0 !important;
    display: grid !important;
    grid-template-columns: repeat(${cols}, 1fr) !important;
    grid-auto-rows: ${rowHeight} !important;
    pointer-events: none !important;
    user-select: none !important;
    overflow: hidden !important;
    z-index: 0 !important;
  `);

  for (let i = 0; i < cols * rows; i += 1) {
    const cell = document.createElement('div');
    cell.textContent = settings.content;
    cell.setAttribute('style', `
      align-self: center !important;
      justify-self: center !important;
      transform: rotate(${settings.rotation}deg) !important;
      font-size: ${settings.fontSize}px !important;
      color: ${settings.color} !important;
      opacity: ${settings.opacity} !important;
      font-weight: 600 !important;
      white-space: nowrap !important;
    `);
    overlay.appendChild(cell);
  }

  return overlay;
}

async function processElementHTMLWithTransform(
  element: HTMLElement,
  transformClone?: (clone: HTMLElement) => void,
): Promise<string> {
  const markerId = '__export_root__';
  const oldId = element.id;
  element.id = markerId;

  try {
    const clone = element.cloneNode(true) as HTMLElement;
    inlineAllStyles(clone);
    removeExportExcluded(clone);
    removeDiagnosisMarks(clone);
    transformClone?.(clone);
    await convertImagesToBase64(clone);
    removeInteractiveAttributes(clone);
    return clone.outerHTML;
  } finally {
    if (oldId) {
      element.id = oldId;
    } else {
      element.removeAttribute('id');
    }
  }
}

export async function processElementHTML(element: HTMLElement): Promise<string> {
  return processElementHTMLWithTransform(element, applyExportLayoutStability);
}

export async function processPNGElementHTML(element: HTMLElement): Promise<string> {
  return processElementHTMLWithTransform(element, applyExportLayoutStability);
}

export async function processContinuousPNGPageHTML(
  element: HTMLElement,
  pageIndex: number,
  pageCount: number,
  watermark?: WatermarkSettings,
): Promise<string> {
  return processElementHTMLWithTransform(element, (clone) => {
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === pageCount - 1;

    clone.classList.add('png-continuous-paper');
    setImportantStyle(clone, 'display', 'block');
    setImportantStyle(clone, 'height', 'auto');
    setImportantStyle(clone, 'max-height', 'none');
    setImportantStyle(clone, 'min-height', '0');
    setImportantStyle(clone, 'overflow', 'visible');
    setImportantStyle(clone, 'margin', '0');
    setImportantStyle(clone, 'box-shadow', 'none');
    setImportantStyle(clone, 'z-index', '1');
    setImportantStyle(clone, 'page-break-after', 'auto');
    setImportantStyle(clone, 'break-after', 'auto');
    setImportantStyle(clone, 'float', 'none');
    setImportantStyle(clone, 'clear', 'none');
    clone.querySelectorAll('[data-watermark-overlay="true"]').forEach((overlay) => {
      overlay.remove();
    });
    const watermarkOverlay = watermark ? createContinuousWatermarkOverlay(watermark) : null;
    if (watermarkOverlay) {
      clone.insertBefore(watermarkOverlay, clone.firstChild);
    }

    if (!isFirstPage) {
      setImportantStyle(clone, 'padding-top', '0');
    }
    if (!isLastPage) {
      setImportantStyle(clone, 'padding-bottom', '0');
    }
    applyExportLayoutStability(clone);
  });
}

/**
 * 提取简历预览 DOM 为自包含 HTML 字符串（单页/容器版）
 *
 * @param previewContainer - 包含所有 .resume-paper div 的容器元素
 * @param documentStyles - 需要嵌入 HTML 的全局样式
 * @param fontCSS - @font-face 声明（字体文件由后端本地提供，使用相对路径引用）
 * @returns 完整的 HTML 文档字符串
 */
export async function extractSelfContainedHTML(
  previewContainer: HTMLElement,
  documentStyles: string,
  fontCSS?: string,
): Promise<string> {
  const bodyHTML = await processElementHTML(previewContainer);
  return wrapAsDocument(bodyHTML, documentStyles, fontCSS);
}

export async function extractPNGSelfContainedHTML(
  previewContainer: HTMLElement,
  documentStyles: string,
  fontCSS?: string,
): Promise<string> {
  const bodyHTML = await processPNGElementHTML(previewContainer);
  return wrapAsDocument(bodyHTML, documentStyles, fontCSS);
}

/**
 * 同步版：提取单页简历 DOM 为自包含 HTML（不需要图片转换时使用）
 */
export function extractSelfContainedHTMLSync(
  previewContainer: HTMLElement,
  documentStyles: string,
  fontCSS?: string,
): string {
  const markerId = '__export_root__';
  const oldId = previewContainer.id;
  previewContainer.id = markerId;

  try {
    const clone = previewContainer.cloneNode(true) as HTMLElement;
    inlineAllStyles(clone);
    removeExportExcluded(clone);
    removeDiagnosisMarks(clone);
    removeInteractiveAttributes(clone);
    return wrapAsDocument(clone.outerHTML, documentStyles, fontCSS);
  } finally {
    if (oldId) {
      previewContainer.id = oldId;
    } else {
      previewContainer.removeAttribute('id');
    }
  }
}

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

/**
 * 收集当前页面上与简历渲染相关的全局样式
 * 包括 index.css 中的 section-header 等规则、布局 CSS、主题 CSS 变量
 */
export function collectDocumentStyles(
  layoutCSS: string,
  colorStyle: string,
): string {
  // 收集页面上的 <style> 标签和 layout CSS
  const extraStyles: string[] = [];

  // 从 document stylesheets 中提取 .resume-paper 相关的规则
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (!sheet.cssRules) continue;
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSStyleRule) {
            // 只提取与简历渲染相关的规则
            const selector = rule.selectorText;
            if (
              selector.includes('.resume-paper') ||
              selector.includes('.section-header') ||
              selector.includes('.section-header-icon') ||
              selector.includes('.section-header-bar') ||
              selector.includes('.tag-badge') ||
              selector.includes('.personal-photo') ||
              selector.includes('.personal-name') ||
              selector.includes('.ordrin-branding')
            ) {
              extraStyles.push(rule.cssText);
            }
          }
        }
      } catch {
        // 跨域 stylesheet 无法读取，跳过
      }
    }
  } catch {
    // 静默处理
  }

  return [
    ...extraStyles,
    layoutCSS,
    // 主题色 CSS（内联 style 中已经固化，但保留以防万一）
    colorStyle,
  ].join('\n');
}
