import i18n from '../i18n';
import type { ImportProgressCallback, ImportResult } from './types';
import { extractPdfPageText } from './pdfText';
import { parseTextWithAI } from './markdown';

export async function importFromPDF(file: File, onProgress?: ImportProgressCallback): Promise<ImportResult> {
  onProgress?.({ stage: 'reading', progress: 6 });
  // 动态导入 pdfjs-dist，避免增大初始 bundle
  const pdfjsLib = await import('pdfjs-dist');

  // 设置 worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  onProgress?.({ stage: 'extracting', progress: 14, current: 0, total: pdf.numPages });

  // Extract page text while preserving the PDF's visual line breaks.
  const textParts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = extractPdfPageText(textContent);
    if (pageText.trim()) {
      textParts.push(pageText);
    }
    onProgress?.({
      stage: 'extracting',
      progress: 14 + Math.round((pageNum / pdf.numPages) * 42),
      current: pageNum,
      total: pdf.numPages,
    });
  }

  const extractedText = textParts.join('\n\n').trim();
  if (!extractedText) {
    throw new Error(i18n.t('import.error.pdfNoText', { ns: 'resume' }));
  }

  const resumeName = file.name.replace(/\.pdf$/i, '');

  // 调用 AI fill 智能解析
  const resumeData = await parseTextWithAI(extractedText, onProgress);

  return { resumeData, resumeName };
}

/**
 * Word 导入：使用 mammoth 提取文本 → 调用 AI fill 智能解析 → 返回 ResumeData
 */
