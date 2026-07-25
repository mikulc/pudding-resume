import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { aiDiagnoseStream } from '../api/ai';
import i18nInstance from '../utils/i18n';
import type { DiagnosisItem, DiagnosisState } from '../types/resume';
import { useResume, useAppUI } from '../context/ResumeContext';
import { getErrorMessage, isAbortError } from '../utils/errors';

import { collectResumeText, normalizeDiagnosisLanguage } from './diagnosis/collectResumeText';
import { DIAGNOSIS_CACHE_VERSION, MAX_DIAGNOSIS_HISTORY, deepClone, getStorageKey, hashContent, initialState, type DiagnosisUndoEntry, type StoredDiagnosis } from './diagnosis/cache';
import { replaceInResume } from './diagnosis/replaceInResume';

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
          .catch((err: unknown) => {
            if (abortController.signal.aborted) return;
            fail(err instanceof Error ? err : new Error(String(err)));
          });
      });
      return true;
    } catch (err: unknown) {
      if (isAbortError(err)) return false;
      setState((prev) => ({
        ...prev,
        loading: false,
        streamingText: '',
        error: getErrorMessage(
          err,
          i18nInstance.t('diagnosisError.failed', { ns: 'editor', lng: diagnosisLanguage }),
        ),
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


export { removeCloudDiagnosisCaches, removeAllDiagnosisCaches } from './diagnosis/cache';
