import i18n from '../i18n';
import type { ResumeData } from '../../types/resume';
import type { ImportProgressCallback, ImportResult } from './types';
import { ensureDefaults } from './validation';

const canonicalAIImportExample = {
  personalInfo: {
    fullName: '',
    phone: '',
    email: '',
    photoUrl: '',
    jobSearchStatus: '',
    targetRole: '',
    preferredLocation: '',
    customFields: [],
    fieldConfig: {
      order: ['fullName', 'phone', 'email', 'jobSearchStatus', 'targetRole', 'preferredLocation'],
      hidden: [],
      labelOverrides: {},
      iconOverrides: {},
    },
  },
  summary: '',
  education: [{ id: '', school: '', major: '', degree: '', startDate: '', endDate: '', details: '' }],
  workExperience: [{ id: '', company: '', location: '', position: '', startDate: '', endDate: '', description: '' }],
  projects: [{ id: '', name: '', role: '', startDate: '', endDate: '', link: '', description: '' }],
  skills: '',
  honors: [{ id: '', name: '', date: '' }],
  customSections: [],
  sectionConfig: {
    order: ['personal', 'education', 'work', 'projects', 'skills', 'honors', 'summary'],
    titleOverrides: {},
    hidden: [],
  },
} satisfies ResumeData;

export const CANONICAL_AI_IMPORT_SCHEMA = JSON.stringify(canonicalAIImportExample, null, 2);

export async function importFromMarkdown(file: File, onProgress?: ImportProgressCallback): Promise<ImportResult> {
  onProgress?.({ stage: 'reading', progress: 8 });
  const text = await file.text();

  if (!text.trim()) {
    throw new Error(i18n.t('import.error.markdownEmpty', { ns: 'resume' }));
  }

  const resumeName = file.name.replace(/\.md$/i, '');

  // 调用 AI 智能解析
  const resumeData = await parseTextWithAI(text, onProgress);

  return { resumeData, resumeName };
}

/**
 * 使用 AI fill 接口将纯文本解析为结构化的 ResumeData
 */
export async function parseTextWithAI(text: string, onProgress?: ImportProgressCallback): Promise<ResumeData> {
  // 动态导入 AI 接口，避免循环依赖
  const { aiService } = await import('../../api/ai');

  const formattingHint = [
    'Formatting preservation rules:',
    '1. Preserve meaningful source line breaks in multi-line fields such as skills, project descriptions, work descriptions, summary, and custom descriptions.',
    '2. When the source contains numbered or bulleted lines, keep each item on its own line in the target string field.',
    '3. Do not merge separate source lines into one long paragraph unless they are clearly the same sentence wrapped by page width.',
    '4. Use YYYY-MM for month dates and "present" for ongoing entries. Do not return YYYY-MM-DD.',
    '5. Put source sections that do not fit a built-in section into customSections; otherwise return an empty array.',
    '6. Return every field from the canonical JSON contract below and do not add legacy fields such as courses or highlights.',
    'Canonical JSON contract:',
    CANONICAL_AI_IMPORT_SCHEMA,
  ].join('\n');
  const prompt = `${i18n.t('import.aiParsePrompt', { ns: 'resume', text })}\n\n${formattingHint}`;

  try {
    onProgress?.({ stage: 'parsing', progress: 62 });
    const result = await aiService(prompt);
    onProgress?.({ stage: 'normalizing', progress: 84 });
    const normalized = ensureDefaults(result.resume_data);
    onProgress?.({ stage: 'normalizing', progress: 90 });
    return normalized;
  } catch (error) {
    const message = error instanceof Error ? error.message : i18n.t('import.error.aiParseFailed', { ns: 'resume' });
    throw new Error(i18n.t('import.error.smartParseFailed', { ns: 'resume', message }));
  }
}
