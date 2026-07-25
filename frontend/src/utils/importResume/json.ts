import i18n from '../i18n';
import type { ThemeSettings } from '../../types/resume';
import type { ImportResult } from './types';
import { ensureDefaults, validateResumeData } from './validation';

export async function importFromJSON(file: File): Promise<ImportResult> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(i18n.t('import.error.jsonInvalid', { ns: 'resume' }));
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(i18n.t('import.error.jsonEmpty', { ns: 'resume' }));
  }

  const obj = parsed as Record<string, unknown>;

  // 兼容两种结构：
  // 1. 顶层直接包含 personalInfo（标准 ResumeData）
  // 2. 顶层包含 content 字段（本地存储/导出的完整简历文件）
  let data: unknown;
  let resumeName = file.name.replace(/\.json$/i, '');
  let sourceUuid: string | null = null;

  if (obj.content && typeof obj.content === 'object') {
    // 完整简历文件格式（包含 content + settings + name + uuid）
    data = obj.content;
    if (typeof obj.name === 'string') {
      resumeName = obj.name;
    }
    // 提取 UUID（导出时附加的简历唯一标识）
    if (typeof obj.uuid === 'string') {
      sourceUuid = obj.uuid;
    }
  } else {
    // 直接是 ResumeData 结构
    data = parsed;
  }

  if (!validateResumeData(data)) {
    throw new Error(i18n.t('import.error.jsonMissingRequiredFields', { ns: 'resume' }));
  }

  // 提取页面/字体设置（若存在）
  let settings: ThemeSettings | null = null;
  if (obj.settings && typeof obj.settings === 'object') {
    settings = obj.settings as ThemeSettings;
  }

  return {
    resumeData: ensureDefaults(data),
    resumeName,
    sourceUuid,
    settings,
  };
}

/**
 * PDF 导入：使用 pdfjs-dist 提取文本 → 调用 AI fill 智能解析 → 返回 ResumeData
 */
