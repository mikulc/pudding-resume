import i18n from '../i18n';
import type { ImportResult } from './types';
import { parseTextWithAI } from './markdown';

export async function importFromWord(file: File): Promise<ImportResult> {
  // 动态导入 mammoth，避免增大初始 bundle
  const mammoth = await import('mammoth');

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  const extractedText = result.value.trim();
  if (!extractedText) {
    throw new Error(i18n.t('import.error.wordNoText', { ns: 'resume' }));
  }

  const resumeName = file.name.replace(/\.docx?$/i, '');

  // 调用 AI fill 智能解析
  const resumeData = await parseTextWithAI(extractedText);

  return { resumeData, resumeName };
}

/**
 * Markdown 导入：读取 .md 文件文本 → 调用 AI fill 智能解析 → 返回 ResumeData
 */
