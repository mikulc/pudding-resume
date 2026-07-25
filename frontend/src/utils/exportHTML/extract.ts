import { inlineAllStyles, removeDiagnosisMarks, removeExportExcluded, removeInteractiveAttributes } from './domStyles';
import { processElementHTML, processPNGElementHTML } from './transform';
import { wrapAsDocument } from './document';

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
