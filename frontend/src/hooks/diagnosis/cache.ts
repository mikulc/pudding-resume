import i18nInstance from '../../utils/i18n';
import type { DiagnosisItem, DiagnosisState, ResumeData } from '../../types/resume';
import { normalizeDiagnosisLanguage } from './collectResumeText';

export const STORAGE_PREFIX = 'pudding_diagnosis';
export const DIAGNOSIS_CACHE_VERSION = 2;

/** 简单的内容哈希（djb2）用于检测简历内容是否变更 */
export function hashContent(content: string): string {
  let h = 5381;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) + h + content.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export interface StoredDiagnosis {
  items: DiagnosisItem[];
  lastDiagnosedAt: number;
  contentHash: string;
  language?: string;
  cacheVersion?: number;
}

export interface DiagnosisUndoEntry {
  data?: ResumeData;
  state: DiagnosisState;
}

export const MAX_DIAGNOSIS_HISTORY = 50;

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const initialState: DiagnosisState = {
  items: [],
  loading: false,
  lastDiagnosedAt: null,
  error: null,
  activeItemId: null,
  streamingText: '',
};

export function getStorageKey(resumeId: string | null, language = i18nInstance.language): string {
  const normalizedLanguage = normalizeDiagnosisLanguage(language);
  return resumeId
    ? `${STORAGE_PREFIX}_${resumeId}_${normalizedLanguage}`
    : `${STORAGE_PREFIX}_current_${normalizedLanguage}`;
}

/** 清除所有云端简历的诊断缓存（ID 不以 'local-' 开头的） */
export function removeCloudDiagnosisCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX + '_') && !key.startsWith(STORAGE_PREFIX + '_local-')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** 清除所有诊断缓存（不分云端/本地） */
export function removeAllDiagnosisCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX + '_')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
