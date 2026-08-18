import i18n from '../i18n';
import type { ResumeData } from '../../types/resume';
import type { ImportResult } from './types';
import { ensureDefaults } from './validation';

export async function importFromMarkdown(file: File): Promise<ImportResult> {
  const text = await file.text();

  if (!text.trim()) {
    throw new Error(i18n.t('import.error.markdownEmpty', { ns: 'resume' }));
  }

  const resumeName = file.name.replace(/\.md$/i, '');

  // 调用 AI 智能解析
  const resumeData = await parseTextWithAI(text);

  return { resumeData, resumeName };
}

/**
 * 使用 AI fill 接口将纯文本解析为结构化的 ResumeData
 */
export async function parseTextWithAI(text: string): Promise<ResumeData> {
  // 动态导入 AI 接口，避免循环依赖
  const { aiService } = await import('../../api/ai');

  const formattingHint = [
    'Formatting preservation rules:',
    '1. Preserve meaningful source line breaks in multi-line fields such as skills, project descriptions, work descriptions, summary, and custom descriptions.',
    '2. When the source contains numbered or bulleted lines, keep each item on its own line in the target string field.',
    '3. Do not merge separate source lines into one long paragraph unless they are clearly the same sentence wrapped by page width.',
  ].join('\n');
  const prompt = `${i18n.t('import.aiParsePrompt', { ns: 'resume', text })}\n\n${formattingHint}`;

  try {
    const result = await aiService(prompt);
    return ensureDefaults(result.resume_data);
  } catch (error) {
    const message = error instanceof Error ? error.message : i18n.t('import.error.aiParseFailed', { ns: 'resume' });
    throw new Error(i18n.t('import.error.smartParseFailed', { ns: 'resume', message }));
  }
}
