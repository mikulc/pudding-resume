import React, { useRef, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useResume, useAppUI } from '../../context/ResumeContext';
import { getAuthToken } from '../../utils/api';
import { saveResumeById, createResume, setResumeCache } from '../../api/resumes';
import { useToast } from './Toast';
import { getAutoSaveInterval, isLocalStorageEnabled } from '../../context/AuthContext';
import { saveResumeToLocal, generateLocalId } from '../../utils/localStorage';
import { setPreviewCache } from '../../utils/previewCache';
import { triggerFloatingEditorComplete } from '../../context/FloatingEditorContext';
import type { ResumeData } from '../../types/resume';

// Module-level ref for retry callback — accessed by SaveStatusIndicator
let retrySaveRef: (() => void) | null = null;
export function triggerRetrySave() {
  retrySaveRef?.();
}

// Module-level ref for manual save trigger — accessed by EditorPage exit flow
let triggerSaveRef: (() => Promise<boolean>) | null = null;
/** Trigger a manual save and return success/failure. Used by exit confirmation flow. */
export function triggerSave(): Promise<boolean> {
  return triggerSaveRef?.() ?? Promise.resolve(false);
}

export function SaveSync({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const { t } = useTranslation(['resume', 'settings']);
  const { data, dataReady } = useResume();
  const { ui, uiDispatch } = useAppUI();
  const { showToast } = useToast();

  // Track the combined snapshot (data + theme) we last considered "saved"
  const lastSavedDataRef = useRef<string>(JSON.stringify({ data, theme: ui.theme }));
  const latestDataRef = useRef(data);
  const isSavingRef = useRef(false);
  const dataChangedBySaveRef = useRef(false);
  // Track whether the initial data load from backend has been synced.
  // Only after this can we reliably detect user modifications.
  const initialSyncDoneRef = useRef(false);
  latestDataRef.current = data;

  const completeFloatingEditorIfOpen = useCallback((): { hasError: boolean } => {
    if (!ui.drawerOpen) return { hasError: false };

    let result = { hasError: false };
    flushSync(() => {
      result = triggerFloatingEditorComplete();
    });
    return result;
  }, [ui.drawerOpen]);

  const getLatestDataSnapshot = useCallback((): { snapshot: string; hasError: false } | { snapshot: null; hasError: true } => {
    const result = completeFloatingEditorIfOpen();
    if (result.hasError) {
      return { snapshot: null, hasError: true };
    }

    return { snapshot: JSON.stringify(latestDataRef.current), hasError: false };
  }, [completeFloatingEditorIfOpen]);

  const replaceEditorUrlIfMissingId = useCallback((effectiveId: string) => {
    if (window.location.pathname === '/resume') {
      navigate(`/resume/${effectiveId}`, { replace: true });
    }
  }, [navigate]);

  // Save to backend and/or local directory.
  // Accepts an optional dataSnapshot — if provided, uses that snapshot as the data to save.
  // Only updates lastSavedDataRef AFTER a successful save, preventing ref contamination
  // if the save fails or the timer is cancelled.
  const performSave = useCallback(async (dataSnapshot?: string, skipCreate = false): Promise<boolean> => {
    if (isSavingRef.current) return false;

    const hasAuth = !!getAuthToken();
    const hasLocal = isLocalStorageEnabled();

    // 若简历来源于本地（ID 以 'local-' 开头），则只保存到本地，不保存到云端
    const isLocalResume = ui.resumeMeta.id?.startsWith('local-') ?? false;

    // Neither auth nor local storage → nothing to do.
    // Also: a local-originated resume without local storage has no save destination.
    if ((!hasAuth && !hasLocal) || (isLocalResume && !hasLocal)) {
      // Still mark as saved if no save destination (data is in memory only)
      uiDispatch({ type: 'TRIGGER_SAVE_ANIMATION' });
      return true;
    }

    // Auto-save: skip if no existing record (first save must be manual)
    if (skipCreate && !ui.resumeMeta.id) return false;

    isSavingRef.current = true;

    uiDispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });

    try {
      const snapshot = dataSnapshot ?? JSON.stringify(latestDataRef.current);
      const resumeData = JSON.parse(snapshot) as ResumeData;

      // Determine the effective resume ID (may be generated for local-only mode)
      let effectiveId = ui.resumeMeta.id;

      // --- Cloud save (authenticated users, cloud-originated resumes only) ---
      if (hasAuth && !isLocalResume) {
        let response: any;
        if (effectiveId) {
          response = await saveResumeById(effectiveId, resumeData, ui.theme);
        } else {
          response = await createResume(resumeData, ui.resumeMeta.name, ui.theme);
        }
        if (!effectiveId && response?.id) {
          const createdId = response.id;
          effectiveId = createdId;
          setResumeCache(createdId, {
            id: createdId,
            name: response.name || ui.resumeMeta.name,
            content: response.content || resumeData,
            settings: response.settings || ui.theme,
          });
          uiDispatch({ type: 'SET_RESUME_META', payload: { id: effectiveId } });
        }
      }

      // --- Local file save (only when not authenticated, or for local-originated resumes) ---
      if (hasLocal && (!hasAuth || isLocalResume)) {
        if (!effectiveId) {
          // No ID from cloud (no auth, or local-only) → generate local ID for first-time save
          effectiveId = generateLocalId();
          uiDispatch({ type: 'SET_RESUME_META', payload: { id: effectiveId } });
        }
        // For local-only mode, await the save; for auth+local (cloud-originated), fire-and-forget
        const localSavePromise = saveResumeToLocal({
          id: effectiveId,
          name: ui.resumeMeta.name || t('list.unnamedResume'),
          content: resumeData,
          settings: ui.theme,
          updated_at: new Date().toISOString(),
        });
        if (!hasAuth || isLocalResume) {
          // Local-only or local-originated resume: must wait for the save to complete
          const ok = await localSavePromise;
          if (!ok) throw new Error(t('settings:localStorage.writeFailed'));
        } else {
          // Auth + local (cloud-originated resume): fire-and-forget (cloud save already succeeded)
          localSavePromise.catch(() => { /* local save failed silently */ });
        }
      }

      // ONLY update lastSavedDataRef after a successful save (include theme)
      lastSavedDataRef.current = JSON.stringify({ data: resumeData, theme: ui.theme });
      dataChangedBySaveRef.current = true;

      // 写入预览缓存，供列表页卡片实时预览
      if (effectiveId) {
        setPreviewCache(effectiveId, resumeData, ui.theme);
        replaceEditorUrlIfMissingId(effectiveId);
      }

      uiDispatch({ type: 'TRIGGER_SAVE_ANIMATION' });
      isSavingRef.current = false;
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      // lastSavedDataRef is NOT updated on failure — preserves the last-known-good snapshot
      uiDispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
      isSavingRef.current = false;
      return false;
    }
  }, [uiDispatch, ui.resumeMeta.name, ui.resumeMeta.id, ui.theme, replaceEditorUrlIfMissingId, t]);

  // Handle retry from error state
  const handleRetry = useCallback(() => {
    if (ui.saveStatus === 'error') {
      const currentDataStr = JSON.stringify(latestDataRef.current);
      void performSave(currentDataStr);
    }
  }, [ui.saveStatus, performSave]);

  // Register retry handler
  useEffect(() => {
    retrySaveRef = handleRetry;
    return () => {
      retrySaveRef = null;
    };
  }, [handleRetry]);

  // Register manual save trigger for external callers (e.g., exit flow)
  useEffect(() => {
    triggerSaveRef = async (): Promise<boolean> => {
      const hasAuth = !!getAuthToken();
      const hasLocal = isLocalStorageEnabled();

      // 若简历来源于本地（ID 以 'local-' 开头），则只保存到本地，不保存到云端
      const isLocalResume = ui.resumeMeta.id?.startsWith('local-') ?? false;

      // Neither auth nor local storage → can't save.
      // Also: a local-originated resume without local storage has no save destination.
      if ((!hasAuth && !hasLocal) || (isLocalResume && !hasLocal)) return false;
      if (isSavingRef.current) return false;

      const currentSnapshot = getLatestDataSnapshot();
      if (currentSnapshot.hasError) {
        showToast(t('list.fixCurrentModuleBeforeSave'), 'error');
        return false;
      }

      isSavingRef.current = true;

      // Snapshot latest data before saving
      const dataToSave = currentSnapshot.snapshot;

      uiDispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });

      try {
        const resumeData = JSON.parse(dataToSave) as ResumeData;

        let effectiveId = ui.resumeMeta.id;

        // --- Cloud save (authenticated users, cloud-originated resumes only) ---
        if (hasAuth && !isLocalResume) {
          let response: any;
          if (effectiveId) {
            response = await saveResumeById(effectiveId, resumeData, ui.theme);
          } else {
            response = await createResume(resumeData, ui.resumeMeta.name, ui.theme);
          }
          if (!effectiveId && response?.id) {
            const createdId = response.id;
            effectiveId = createdId;
            setResumeCache(createdId, {
              id: createdId,
              name: response.name || ui.resumeMeta.name,
              content: response.content || resumeData,
              settings: response.settings || ui.theme,
            });
            uiDispatch({ type: 'SET_RESUME_META', payload: { id: effectiveId } });
          }
        }

        // --- Local file save (only when not authenticated, or for local-originated resumes) ---
        if (hasLocal && (!hasAuth || isLocalResume)) {
          if (!effectiveId) {
            effectiveId = generateLocalId();
            uiDispatch({ type: 'SET_RESUME_META', payload: { id: effectiveId } });
          }
          const localSavePromise = saveResumeToLocal({
            id: effectiveId,
            name: ui.resumeMeta.name || t('list.unnamedResume'),
            content: resumeData,
            settings: ui.theme,
            updated_at: new Date().toISOString(),
          });
          if (!hasAuth || isLocalResume) {
            const ok = await localSavePromise;
            if (!ok) throw new Error(t('settings:localStorage.writeFailed'));
          } else {
            localSavePromise.catch(() => { /* local save failed silently */ });
          }
        }

        lastSavedDataRef.current = JSON.stringify({ data: resumeData, theme: ui.theme });
        dataChangedBySaveRef.current = true;

        // 写入预览缓存，供列表页卡片实时预览
        if (effectiveId) {
          setPreviewCache(effectiveId, resumeData, ui.theme);
          replaceEditorUrlIfMissingId(effectiveId);
        }

        uiDispatch({ type: 'TRIGGER_SAVE_ANIMATION' });
        isSavingRef.current = false;

        return true;
      } catch (e) {
        console.error('Manual save failed:', e);
        uiDispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
        isSavingRef.current = false;
        return false;
      }
    };
    return () => {
      triggerSaveRef = null;
    };
  }, [getLatestDataSnapshot, ui.resumeMeta.name, ui.resumeMeta.id, ui.theme, uiDispatch, replaceEditorUrlIfMissingId, showToast, t]);

  // Compare combined (data + theme) with last saved snapshot — detect unsaved changes
  const currentCombinedStr = JSON.stringify({ data, theme: ui.theme });

  // When backend data finishes loading, sync lastSavedDataRef once.
  // Until this completes, all data changes are the initial load, not user edits.
  useEffect(() => {
    if (!initialSyncDoneRef.current && dataReady) {
      lastSavedDataRef.current = currentCombinedStr;
      initialSyncDoneRef.current = true;
      return;
    }
  }, [dataReady, currentCombinedStr]);

  useEffect(() => {
    // Skip if initial sync hasn't completed yet
    if (!initialSyncDoneRef.current) return;

    // Skip if we just completed a save
    if (dataChangedBySaveRef.current) {
      dataChangedBySaveRef.current = false;
      return;
    }

    // Skip if currently saving
    if (isSavingRef.current) return;

    if (currentCombinedStr !== lastSavedDataRef.current) {
      if (ui.saveStatus !== 'unsaved') {
        uiDispatch({ type: 'SET_SAVE_STATUS', payload: 'unsaved' });
      }
    } else {
      // Combined snapshot matches the last-saved snapshot — mark as saved if currently unsaved
      // (e.g., user undid changes via Ctrl+Z back to the saved state)
      if (ui.saveStatus === 'unsaved') {
        uiDispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
      }
    }
  }, [currentCombinedStr, ui.saveStatus, uiDispatch]);

  // Intercept Ctrl+S / Cmd+S — 保存整份简历
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();

        const hasAuth = !!getAuthToken();
        const hasLocal = isLocalStorageEnabled();

        if (!hasAuth && !hasLocal) {
          showToast(t('list.loginOrLocalRequired'), 'info');
          return;
        }

        // 浮层（抽屉）打开时，先完成当前模块编辑，再保存整份简历
        const currentSnapshot = getLatestDataSnapshot();
        if (currentSnapshot.hasError) {
          showToast(t('list.fixCurrentModuleBeforeSave'), 'error');
          return;
        }

        // 保存整份简历
        void performSave(currentSnapshot.snapshot).then((success) => {
          if (!success) {
            showToast(t('list.saveFailedRetry'), 'error');
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [performSave, getLatestDataSnapshot, showToast, t]);

  // Auto-save (configurable debounce) — only when there's a save destination
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hasAuth = !!getAuthToken();
    const hasLocal = isLocalStorageEnabled();

    // No save destination → skip auto-save
    if (!hasAuth && !hasLocal) return;

    const intervalSec = getAutoSaveInterval();
    // 0 means auto-save is disabled
    if (intervalSec === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const currentSnapshot = getLatestDataSnapshot();
      if (currentSnapshot.hasError) return;
      void performSave(currentSnapshot.snapshot, true);
    }, intervalSec * 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, ui.theme, performSave, getLatestDataSnapshot]);

  return <>{children}</>;
}
