import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { aiDiagnoseStream } from '../api/ai';
import i18nInstance from '../utils/i18n';
import type { DiagnosisItem, DiagnosisState, ResumeData, ResumeAction } from '../types/resume';
import { useResume, useAppUI } from '../context/ResumeContext';


/**
 * 收集简历中的所有文本内容，拼接成 AI 可分析的纯文本。保留模块标签帮助 AI 定位。
 */
function normalizeDiagnosisLanguage(language: string): 'zh-CN' | 'en-US' {
  return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

function collectResumeText(data: import('../types/resume').ResumeData, language = i18nInstance.language): string {
  const parts: string[] = [];
  const normalizedLanguage = normalizeDiagnosisLanguage(language);
  const promptText = (key: string) => i18nInstance.t(`diagnosisPrompt.${key}`, { ns: 'editor', lng: normalizedLanguage });

  // 个人简介
  if (data.summary?.trim()) {
    parts.push(`[${promptText('summary')}]\n${data.summary}`);
  }

  // 专业技能
  if (data.skills?.trim()) {
    parts.push(`[${promptText('skills')}]\n${data.skills}`);
  }

  // 教育经历
  if (data.education?.length) {
    parts.push(`[${promptText('education')}]`);
    data.education.forEach((edu) => {
      parts.push(`- ${[edu.school, edu.major, edu.degree].filter(Boolean).join(' · ')}`);
      if (edu.courses?.trim()) parts.push(`  ${promptText('courses')}: ${edu.courses}`);
    });
  }

  // 工作经历
  if (data.workExperience?.length) {
    parts.push(`[${promptText('workExperience')}]`);
    data.workExperience.forEach((work) => {
      parts.push(`- ${[work.company, work.position].filter(Boolean).join(' - ')}`);
      if (work.highlights?.trim()) {
        parts.push(`  ${work.highlights}`);
      }
    });
  }

  // 项目经历
  if (data.projects?.length) {
    parts.push(`[${promptText('projects')}]`);
    data.projects.forEach((proj) => {
      parts.push(`- ${[proj.name, proj.role].filter(Boolean).join(' - ')}`);
      if (proj.highlights?.trim()) {
        parts.push(`  ${proj.highlights}`);
      }
    });
  }

  // 荣誉奖项
  if (data.honors?.length) {
    parts.push(`[${promptText('honors')}]`);
    data.honors.forEach((h) => {
      parts.push(`- ${h.name}${h.date ? ` (${h.date})` : ''}`);
    });
  }

  // 资质证书
  if (data.certifications?.length) {
    parts.push(`[${promptText('certifications')}]`);
    data.certifications.forEach((c) => {
      parts.push(`- ${c.name}${c.date ? ` (${c.date})` : ''}`);
    });
  }

  // 作品展示
  if (data.portfolio?.length) {
    parts.push(`[${promptText('portfolio')}]`);
    data.portfolio.forEach((p) => {
      parts.push(`- ${p.name}`);
      if (p.description?.trim()) parts.push(`  ${p.description}`);
    });
  }

  // 自定义模块
  if (data.customSections?.length) {
    data.customSections.forEach((cs) => {
      if (cs.content?.trim()) {
        parts.push(`[${cs.name || promptText('customSection')}]\n${cs.content}`);
      }
    });
  }

  return parts.join('\n\n');
}

const STORAGE_PREFIX = 'pudding_diagnosis';
const DIAGNOSIS_CACHE_VERSION = 2;

/** 简单的内容哈希（djb2）用于检测简历内容是否变更 */
function hashContent(content: string): string {
  let h = 5381;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) + h + content.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

interface StoredDiagnosis {
  items: DiagnosisItem[];
  lastDiagnosedAt: number;
  contentHash: string;
  language?: string;
  cacheVersion?: number;
}

interface DiagnosisUndoEntry {
  data?: ResumeData;
  state: DiagnosisState;
}

const MAX_DIAGNOSIS_HISTORY = 50;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const initialState: DiagnosisState = {
  items: [],
  loading: false,
  lastDiagnosedAt: null,
  error: null,
  activeItemId: null,
  streamingText: '',
};

function getStorageKey(resumeId: string | null, language = i18nInstance.language): string {
  const normalizedLanguage = normalizeDiagnosisLanguage(language);
  return resumeId
    ? `${STORAGE_PREFIX}_${resumeId}_${normalizedLanguage}`
    : `${STORAGE_PREFIX}_current_${normalizedLanguage}`;
}

/**
 * 将后端 section_module 映射到前端 section key，
 * 并在对应简历数据中查找 needle 文本，替换为 replacement。
 * 返回 true 表示替换成功。
 */
function replaceInResume(
  data: ResumeData,
  sectionModule: string,
  needle: string,
  replacement: string,
  dispatch: React.Dispatch<ResumeAction>,
): boolean {
  const replaceText = (text: string | undefined) => (
    text?.includes(needle) ? text.replace(needle, replacement) : null
  );

  const replaceInAnySection = (): boolean => {
    const nextSkills = replaceText(data.skills);
    if (nextSkills !== null) {
      dispatch({ type: 'SET_SKILLS', payload: nextSkills });
      return true;
    }

    const nextSummary = replaceText(data.summary);
    if (nextSummary !== null) {
      dispatch({ type: 'SET_SUMMARY', payload: nextSummary });
      return true;
    }

    for (const w of data.workExperience ?? []) {
      const nextHighlights = replaceText(w.highlights);
      if (nextHighlights !== null) {
        dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId: w.id, highlights: nextHighlights } });
        return true;
      }
    }

    for (const p of data.projects ?? []) {
      const nextHighlights = replaceText(p.highlights);
      if (nextHighlights !== null) {
        dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: p.id, highlights: nextHighlights } });
        return true;
      }
    }

    for (const e of data.education ?? []) {
      const nextCourses = replaceText(e.courses);
      if (nextCourses !== null) {
        dispatch({ type: 'UPDATE_EDUCATION', payload: { ...e, courses: nextCourses } });
        return true;
      }
    }

    for (const h of data.honors ?? []) {
      const nextName = replaceText(h.name);
      if (nextName !== null) {
        dispatch({ type: 'UPDATE_HONOR', payload: { ...h, name: nextName } });
        return true;
      }
    }

    for (const p of data.portfolio ?? []) {
      const nextDescription = replaceText(p.description);
      if (nextDescription !== null) {
        dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...p, description: nextDescription } });
        return true;
      }
    }

    for (const cs of data.customSections ?? []) {
      const nextContent = replaceText(cs.content);
      if (nextContent !== null) {
        dispatch({ type: 'UPDATE_CUSTOM_SECTION', payload: { id: cs.id, updates: { content: nextContent } } });
        return true;
      }
    }

    return false;
  };

  // 后端可能使用 'experience'，前端用 'work'
  const key = sectionModule === 'experience' ? 'work' : sectionModule;

  switch (key) {
    case 'skills':
      {
        const nextSkills = replaceText(data.skills);
        if (nextSkills !== null) {
          dispatch({ type: 'SET_SKILLS', payload: nextSkills });
          return true;
        }
      }
      break;
    case 'summary':
      {
        const nextSummary = replaceText(data.summary);
        if (nextSummary !== null) {
          dispatch({ type: 'SET_SUMMARY', payload: nextSummary });
          return true;
        }
      }
      break;
    case 'work':
      for (const w of data.workExperience ?? []) {
        const nextHighlights = replaceText(w.highlights);
        if (nextHighlights !== null) {
          dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId: w.id, highlights: nextHighlights } });
          return true;
        }
      }
      break;
    case 'projects':
      for (const p of data.projects ?? []) {
        const nextHighlights = replaceText(p.highlights);
        if (nextHighlights !== null) {
          dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: p.id, highlights: nextHighlights } });
          return true;
        }
      }
      break;
    case 'education':
      for (const e of data.education ?? []) {
        const nextCourses = replaceText(e.courses);
        if (nextCourses !== null) {
          dispatch({ type: 'UPDATE_EDUCATION', payload: { ...e, courses: nextCourses } });
          return true;
        }
      }
      break;
    case 'honors':
      for (const h of data.honors ?? []) {
        const nextName = replaceText(h.name);
        if (nextName !== null) {
          dispatch({ type: 'UPDATE_HONOR', payload: { ...h, name: nextName } });
          return true;
        }
      }
      break;
    case 'portfolio':
      for (const p of data.portfolio ?? []) {
        const nextDescription = replaceText(p.description);
        if (nextDescription !== null) {
          dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...p, description: nextDescription } });
          return true;
        }
      }
      break;
    default:
      for (const cs of data.customSections ?? []) {
        const nextContent = replaceText(cs.content);
        if (nextContent !== null) {
          dispatch({ type: 'UPDATE_CUSTOM_SECTION', payload: { id: cs.id, updates: { content: nextContent } } });
          return true;
        }
      }
      break;
  }

  return replaceInAnySection();
}

export function useDiagnosis() {
  const { i18n } = useTranslation();
  const { data, dataReady, dispatch } = useResume();
  const { ui } = useAppUI();
  const resumeId = ui.resumeMeta?.id ?? null;
  const diagnosisLanguage = normalizeDiagnosisLanguage(i18n.language);
  const [state, setState] = useState<DiagnosisState>(initialState);
  const [canUndoLastAction, setCanUndoLastAction] = useState(false);
  const currentHashRef = useRef<string>('');
  const undoStackRef = useRef<DiagnosisUndoEntry[]>([]);
  // 防止在 dataReady 和 resumeId 稳定前多次触发恢复
  const restoredRef = useRef<string | null>(null);
  // 用于取消正在进行的诊断请求
  const abortRef = useRef<AbortController | null>(null);

  const syncItemsToStorage = useCallback((items: DiagnosisItem[]) => {
    try {
      const storageKey = getStorageKey(resumeId, diagnosisLanguage);
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const stored = JSON.parse(raw);
      stored.items = items;
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
  }, [diagnosisLanguage, resumeId]);

  const pushUndoSnapshot = useCallback((snapshot: DiagnosisUndoEntry) => {
    undoStackRef.current = [
      ...undoStackRef.current.slice(-(MAX_DIAGNOSIS_HISTORY - 1)),
      deepClone(snapshot),
    ];
    setCanUndoLastAction(true);
  }, []);

  const resetUndoStack = useCallback(() => {
    undoStackRef.current = [];
    setCanUndoLastAction(false);
  }, []);

  // 初始化：等简历数据加载完成后，从 localStorage 恢复诊断结果
  useEffect(() => {
    if (!dataReady) return;

    const content = collectResumeText(data, diagnosisLanguage);
    const hash = hashContent(content);
    currentHashRef.current = hash;

    const storageKey = getStorageKey(resumeId, diagnosisLanguage);

    // 同一个 resumeId 只恢复一次
    if (restoredRef.current === storageKey) return;
    restoredRef.current = storageKey;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setState((prev) => (prev.items.length > 0 || prev.error ? initialState : prev));
        return;
      }
      const stored: StoredDiagnosis = JSON.parse(raw);
      if (
        stored.contentHash === hash
        && stored.items?.length > 0
        && (!stored.language || stored.language === diagnosisLanguage)
        && stored.cacheVersion === DIAGNOSIS_CACHE_VERSION
      ) {
        setState((prev) => ({
          ...prev,
          items: stored.items,
          lastDiagnosedAt: stored.lastDiagnosedAt,
        }));
      } else {
        localStorage.removeItem(storageKey);
        setState((prev) => (prev.items.length > 0 || prev.error ? initialState : prev));
      }
    } catch {
      localStorage.removeItem(storageKey);
      setState((prev) => (prev.items.length > 0 || prev.error ? initialState : prev));
    }
  }, [dataReady, diagnosisLanguage, resumeId, data]);

  useEffect(() => {
    resetUndoStack();
  }, [resetUndoStack, resumeId]);

  /** 执行诊断（流式 SSE） */
  const runDiagnosis = useCallback(async () => {
    const content = collectResumeText(data, diagnosisLanguage);
    if (content.trim().length < 10) return false;

    const hash = hashContent(content);

    // 取消上一个进行中的请求
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setState((prev) => ({ ...prev, loading: true, error: null, items: [], streamingText: '' }));

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const fail = (error: Error) => {
          if (settled) return;
          settled = true;
          reject(error);
        };

        aiDiagnoseStream(
          content,
          {
            onProgress: (text: string) => {
              if (abortController.signal.aborted) return;
              setState((prev) => ({ ...prev, streamingText: text }));
            },
            onResult: (items: DiagnosisItem[]) => {
              if (abortController.signal.aborted) return;
              const lastDiagnosedAt = Date.now();
              resetUndoStack();

              // 保存到 localStorage
              const stored: StoredDiagnosis = {
                items,
                lastDiagnosedAt,
                contentHash: hash,
                language: diagnosisLanguage,
                cacheVersion: DIAGNOSIS_CACHE_VERSION,
              };
              try {
                localStorage.setItem(getStorageKey(resumeId, diagnosisLanguage), JSON.stringify(stored));
                currentHashRef.current = hash;
              } catch { /* ignore */ }

              setState((prev) => ({
                ...prev,
                loading: false,
                items,
                lastDiagnosedAt,
                streamingText: '',
              }));
              finish();
            },
            onError: (message: string) => {
              if (abortController.signal.aborted) return;
              setState((prev) => ({
                ...prev,
                loading: false,
                error: message,
                streamingText: '',
              }));
              fail(new Error(message));
            },
          },
          abortController.signal,
          diagnosisLanguage,
        )
          .then(() => {
            if (abortController.signal.aborted || settled) return;
            fail(new Error(i18nInstance.t('diagnosisError.failed', { ns: 'editor', lng: diagnosisLanguage })));
          })
          .catch((err: any) => {
            if (abortController.signal.aborted) return;
            fail(err instanceof Error ? err : new Error(String(err)));
          });
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      setState((prev) => ({
        ...prev,
        loading: false,
        streamingText: '',
        error: err.message || i18nInstance.t('diagnosisError.failed', { ns: 'editor', lng: diagnosisLanguage }),
      }));
      return false;
    }
  }, [data, diagnosisLanguage, resetUndoStack, resumeId]);

  /** 清除诊断结果 */
  const clearDiagnosis = useCallback(() => {
    abortRef.current?.abort();
    try {
      localStorage.removeItem(getStorageKey(resumeId, diagnosisLanguage));
    } catch {}
    currentHashRef.current = '';
    resetUndoStack();
    setState(initialState);
  }, [diagnosisLanguage, resetUndoStack, resumeId]);

  /** 设置/切换高亮的诊断项 */
  const setActiveItem = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, activeItemId: id }));
  }, []);

  /** 按 section_module 过滤诊断项 */
  const getItemsByModule = useCallback(
    (module: string): DiagnosisItem[] => {
      return state.items.filter((item) => item.section_module === module);
    },
    [state.items],
  );

  /** 忽略单条诊断建议：从列表中移除 */
  const ignoreItem = useCallback((id: string) => {
    setState((prev) => {
      const newItems = prev.items.filter((item) => item.id !== id);
      // 同步更新 localStorage
      try {
        const storageKey = getStorageKey(resumeId, diagnosisLanguage);
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const stored = JSON.parse(raw);
          stored.items = newItems;
          localStorage.setItem(storageKey, JSON.stringify(stored));
        }
      } catch { /* ignore */ }
      return {
        ...prev,
        items: newItems,
        activeItemId: prev.activeItemId === id ? null : prev.activeItemId,
      };
    });
  }, [diagnosisLanguage, resumeId]);

  /** 一键优化：将 original_text 替换为 replacement，然后移除该诊断项 */
  const optimizeItem = useCallback((id: string) => {
    setState((prev) => {
      const item = prev.items.find((i) => i.id === id);
      if (!item || !item.replacement) return prev;

      const needle = item.original_text.trim();
      if (!needle) return prev;

      // 在简历数据中执行文本替换
      replaceInResume(data, item.section_module, needle, item.replacement, dispatch);

      // 从列表中移除该诊断项
      const newItems = prev.items.filter((i) => i.id !== id);

      // 同步更新 localStorage
      try {
          const storageKey = getStorageKey(resumeId, diagnosisLanguage);
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const stored = JSON.parse(raw);
          stored.items = newItems;
          localStorage.setItem(storageKey, JSON.stringify(stored));
        }
      } catch { /* ignore */ }

      return {
        ...prev,
        items: newItems,
        activeItemId: prev.activeItemId === id ? null : prev.activeItemId,
      };
    });
  }, [diagnosisLanguage, resumeId, data, dispatch]);

  void ignoreItem;
  void optimizeItem;

  const ignoreItemWithUndo = useCallback((id: string) => {
    setState((prev) => {
      const item = prev.items.find((i) => i.id === id);
      if (!item) return prev;

      pushUndoSnapshot({
        state: prev,
      });

      const newItems = prev.items.filter((item) => item.id !== id);
      syncItemsToStorage(newItems);
      return {
        ...prev,
        items: newItems,
        activeItemId: prev.activeItemId === id ? null : prev.activeItemId,
      };
    });
  }, [pushUndoSnapshot, syncItemsToStorage]);

  const optimizeItemWithUndo = useCallback((id: string) => {
    setState((prev) => {
      const item = prev.items.find((i) => i.id === id);
      if (!item || !item.replacement) return prev;

      const needle = item.original_text.trim();
      if (!needle) return prev;

      const replaced = replaceInResume(data, item.section_module, needle, item.replacement, dispatch);
      if (!replaced) return prev;

      pushUndoSnapshot({
        data,
        state: prev,
      });

      const newItems = prev.items.filter((i) => i.id !== id);
      syncItemsToStorage(newItems);
      return {
        ...prev,
        items: newItems,
        activeItemId: prev.activeItemId === id ? null : prev.activeItemId,
      };
    });
  }, [data, dispatch, pushUndoSnapshot, syncItemsToStorage]);

  const undoLastAction = useCallback((): boolean => {
    const snapshot = undoStackRef.current.pop();
    setCanUndoLastAction(undoStackRef.current.length > 0);
    if (!snapshot) return false;

    const next = deepClone(snapshot);
    if (next.data) {
      dispatch({ type: 'RESTORE_STATE', payload: next.data });
    }
    setState(next.state);
    syncItemsToStorage(next.state.items);
    return true;
  }, [dispatch, syncItemsToStorage]);

  return {
    ...state,
    runDiagnosis,
    clearDiagnosis,
    setActiveItem,
    getItemsByModule,
    ignoreItem: ignoreItemWithUndo,
    optimizeItem: optimizeItemWithUndo,
    undoLastAction,
    canUndoLastAction,
    /** 是否有诊断结果 */
    hasResults: state.items.length > 0,
  };
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
