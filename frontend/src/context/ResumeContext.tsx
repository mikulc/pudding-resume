import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResumeData, ResumeAction, AppUIState, AppUIAction, DEFAULT_THEME, DEFAULT_SECTION_ORDER, ThemeSettings, SectionKey, RightPanelTab, MobileDockMode } from '../types/resume';
import { getAuthToken } from '../utils/api';
import { getResumeById } from '../api/resumes';
import { getPreviewCache } from '../utils/previewCache';
import { createEmptyResumeData, createInitialThemeSettings } from '../utils/resumeDraft';
import { loadLocalResumes } from '../utils/localStorage';
import {
  clearDraftResumeLaunch,
  clearExistingResumeLaunch,
  clearLocalResumeLaunch,
  readDraftResumeLaunch,
  readExistingResumeLaunchId,
  readLocalResumeLaunch,
} from '../utils/resumeLaunch';
import i18n from '../utils/i18n';

import { resumeReducer } from '../features/resume/model/resumeReducer';
import { MAX_HISTORY, createDocumentSnapshot, deepClone, getSnapshotKey, type DocumentHistorySnapshot } from '../features/resume/model/history';
import { appUIReducer } from '../features/resume/model/appUIReducer';
const emptyResumeData: ResumeData = createEmptyResumeData();


interface ResumeContextType {
  data: ResumeData;
  dispatch: React.Dispatch<ResumeAction>;
  /** Whether the initial resume data has been loaded (or skipped). Used to hide empty-state flash. */
  dataReady: boolean;
  /** Persisted style settings loaded from backend — used to restore theme on editor mount. */
  initialSettings: ThemeSettings | null;
}

export const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

// ====== 全局历史栈 Context ======

interface HistoryContextType {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export function ResumeProvider({ children, resumeId }: { children: React.ReactNode; resumeId?: string }) {
  // Always start with empty data — all content comes from the database.
  // Logged-in users get their saved data loaded asynchronously below.
  const [data, rawDispatch] = useReducer(resumeReducer, emptyResumeData);
  const [dataReady, setDataReady] = useState(false);
  const [initialSettings, setInitialSettings] = useState<ThemeSettings | null>(null);

  // Async: load resume from backend if logged in (database is the only persistence)
  // Skip loading when coming from blank template creation — start fresh instead.
  //
  // NOTE: sessionStorage removals are deferred via setTimeout(0) or guarded by
  // !cancelled so that React StrictMode's double-effect-invocation (mount →
  // cleanup → remount → effect) still sees the flags on the second run,
  // preventing a fallback to stale DB data.
  useEffect(() => {
    // Blank / template-based creation (works for both logged-in and non-logged-in users).
    // Template data (if any) is loaded from sessionStorage below.
    const draftLaunch = readDraftResumeLaunch();
    if (draftLaunch) {
      if (draftLaunch.data) {
        rawDispatch({ type: 'LOAD_DATA', payload: draftLaunch.data });
      }
      setDataReady(true);
      setInitialSettings(
        draftLaunch.settings
          ?? (draftLaunch.layoutId
            ? createInitialThemeSettings(draftLaunch.layoutId, draftLaunch.themeColor)
            : null),
      );

      // Defer removal so StrictMode re-run still sees the flags.
      setTimeout(clearDraftResumeLaunch, 0);

      return;
    }

    // URL-driven: resumeId from route param takes priority over sessionStorage
    if (resumeId) {
      if (resumeId.startsWith('local-')) {
        let cancelled = false;
        (async () => {
          // Local resume: prefer preview cache (updated on every save), fall back to sessionStorage,
          // then read the persisted local file so refreshing /resume/local-* keeps the document.
          let loaded = false;
          const cached = getPreviewCache(resumeId);
          if (cached) {
            rawDispatch({ type: 'LOAD_DATA', payload: cached.content });
            if (cached.theme) {
              setInitialSettings(cached.theme);
            }
            loaded = true;
          }

          if (!loaded) {
            const stagedLocalResume = readLocalResumeLaunch();
            if (stagedLocalResume?.id === resumeId) {
              rawDispatch({ type: 'LOAD_DATA', payload: stagedLocalResume.data });
              if (stagedLocalResume.settings) setInitialSettings(stagedLocalResume.settings);
              loaded = true;
            }
          }

          if (!loaded) {
            const localResumes = await loadLocalResumes();
            if (cancelled) return;
            const localResume = localResumes.find((item) => item.id === resumeId);
            if (localResume) {
              rawDispatch({ type: 'LOAD_DATA', payload: localResume.content });
              if (localResume.settings) {
                setInitialSettings(localResume.settings);
              }
            }
          }

          if (!cancelled) setDataReady(true);
        })();
        return () => { cancelled = true; };
      }

      // Cloud resume: directly fetch from backend by ID
      let cancelled = false;
      (async () => {
        try {
          const remote = await getResumeById(resumeId);
          if (cancelled) return;
          if (remote) {
            rawDispatch({ type: 'LOAD_DATA', payload: remote.content });
            if (remote.settings) {
              setInitialSettings(remote.settings);
            }
          }
        } catch {
          // API unavailable — keep empty data
        } finally {
          if (!cancelled) setDataReady(true);
        }
      })();
      return () => { cancelled = true; };
    }

    const stagedLocalResume = readLocalResumeLaunch();
    if (stagedLocalResume) {
      rawDispatch({ type: 'LOAD_DATA', payload: stagedLocalResume.data });
      if (stagedLocalResume.settings) setInitialSettings(stagedLocalResume.settings);
      setDataReady(true);
      setTimeout(clearLocalResumeLaunch, 0);
      return;
    }

    if (!getAuthToken()) {
      // Check for local resume data (from sessionStorage) before skipping
      const existingIdStr = sessionStorage.getItem('existing_resume_id');
      if (existingIdStr && existingIdStr.startsWith('local-')) {
        const localDataStr = sessionStorage.getItem('local_resume_data');
        if (localDataStr) {
          try {
            const localData = JSON.parse(localDataStr);
            rawDispatch({ type: 'LOAD_DATA', payload: localData });
            const localSettingsStr = sessionStorage.getItem('local_resume_settings');
            if (localSettingsStr) {
              try {
                const localSettings = JSON.parse(localSettingsStr);
                setInitialSettings(localSettings);
              } catch { /* ignore */ }
            }
          } catch {
            // Data parse error — keep empty data
          }
        }
        setDataReady(true);
        setTimeout(() => {
          sessionStorage.removeItem('existing_resume_id');
          sessionStorage.removeItem('existing_resume_name');
          sessionStorage.removeItem('local_resume_data');
          sessionStorage.removeItem('local_resume_settings');
        }, 0);
        return;
      }

      // Non-logged-in users: no remote loading needed, ready immediately
      setDataReady(true);
      return;
    }

    // Existing resume: load specific resume by ID from sessionStorage
    const existingIdStr = readExistingResumeLaunchId();
    if (existingIdStr) {
      // Local resume: load data directly from sessionStorage
      if (existingIdStr.startsWith('local-')) {
        const localDataStr = sessionStorage.getItem('local_resume_data');
        if (localDataStr) {
          try {
            const localData = JSON.parse(localDataStr);
            rawDispatch({ type: 'LOAD_DATA', payload: localData });
            const localSettingsStr = sessionStorage.getItem('local_resume_settings');
            if (localSettingsStr) {
              try {
                const localSettings = JSON.parse(localSettingsStr);
                setInitialSettings(localSettings);
              } catch { /* ignore settings parse error */ }
            }
          } catch {
            // Data parse error — keep empty data
          }
        }
        setDataReady(true);
        // Clean up after load (deferred for StrictMode compat)
        setTimeout(() => {
          sessionStorage.removeItem('existing_resume_id');
          sessionStorage.removeItem('existing_resume_name');
          sessionStorage.removeItem('local_resume_data');
          sessionStorage.removeItem('local_resume_settings');
        }, 0);
        return;
      }

      const id = existingIdStr;
      let cancelled = false;
      (async () => {
        try {
          const remote = await getResumeById(id);
          if (cancelled) return;
          if (remote) {
            rawDispatch({ type: 'LOAD_DATA', payload: remote.content });
            if (remote.settings) {
              setInitialSettings(remote.settings);
            }
          }
        } catch {
          // API unavailable — keep empty data already set as initial state
        } finally {
          if (!cancelled) {
            setDataReady(true);
            // Only remove on successful (non-cancelled) run so StrictMode
            // double-invocation still sees these flags on the re-run.
            clearExistingResumeLaunch();
          }
        }
      })();
      return () => { cancelled = true; };
    }

    // No route ID and no explicit session handoff means this is a fresh resume.
    // Do not fall back to the latest saved resume, or a new blank flow can briefly
    // render stale content such as the previous resume's photo.
    setInitialSettings(null);
    setDataReady(true);
    return;
  }, [resumeId]);

  // Document history is managed by HistoryProvider after data and settings are ready.
  const dispatch = useCallback(
    (action: ResumeAction) => {
      rawDispatch(action);
    },
    [rawDispatch]
  );

  return (
    <ResumeContext.Provider value={{ data, dispatch, dataReady, initialSettings }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}

export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
}

// ---- App UI State ----

const defaultAppUI: AppUIState = {
  activeSection: 'personal',
  zoom: 1,
  settingsOpen: true,
  editorOpen: true,
  theme: DEFAULT_THEME,
  saveStatus: 'saved',
  saveTrigger: 0,
  lastSavedAt: null,
  drawerOpen: false,
  isSecondaryEditorOpen: false,
  resumeMeta: { id: null, name: i18n.t('list.unnamedResume', { ns: 'resume' }) },
  rightPanelTab: 'settings',
  mobileDockMode: 'edit',
};

const LAST_ACTIVE_SECTION_STORAGE_KEY = 'resume_editor_last_expanded_section';
const RIGHT_PANEL_TAB_STORAGE_KEY = 'resume_editor_right_panel_tab';
const MOBILE_DOCK_MODE_STORAGE_KEY = 'resume_editor_mobile_dock_mode';

function getInitialActiveSection(): SectionKey {
  if (typeof window === 'undefined') return 'personal';
  const stored = window.localStorage.getItem(LAST_ACTIVE_SECTION_STORAGE_KEY);
  return DEFAULT_SECTION_ORDER.includes(stored as SectionKey) ? (stored as SectionKey) : 'personal';
}

function getInitialRightPanelTab(): RightPanelTab {
  return 'settings';
}

function getInitialMobileDockMode(): MobileDockMode {
  if (typeof window === 'undefined') return 'edit';
  const stored = window.localStorage.getItem(MOBILE_DOCK_MODE_STORAGE_KEY);
  if (stored === 'settings' || stored === 'preview') return stored;
  return 'edit';
}

interface AppUIContextType {
  ui: AppUIState;
  uiDispatch: React.Dispatch<AppUIAction>;
}

export const AppUIContext = createContext<AppUIContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ui, rawUiDispatch] = useReducer(appUIReducer, undefined, () => ({
    ...defaultAppUI,
    activeSection: getInitialActiveSection(),
    rightPanelTab: getInitialRightPanelTab(),
    mobileDockMode: getInitialMobileDockMode(),
    theme: {
      ...defaultAppUI.theme,
      watermark: {
        ...defaultAppUI.theme.watermark,
        content: i18n.t('watermark.defaultContent', { ns: 'resume' }),
        isCustomContent: false,
      },
    },
  }));

  const uiDispatch = useCallback<React.Dispatch<AppUIAction>>((action) => {
    if (action.type === 'SET_ACTIVE_SECTION') {
      if (action.payload) {
        window.localStorage.setItem(LAST_ACTIVE_SECTION_STORAGE_KEY, action.payload);
      } else {
        window.localStorage.removeItem(LAST_ACTIVE_SECTION_STORAGE_KEY);
      }
    }
    if (action.type === 'SET_RIGHT_PANEL_TAB') {
      window.localStorage.setItem(RIGHT_PANEL_TAB_STORAGE_KEY, action.payload);
    }
    if (action.type === 'SET_MOBILE_DOCK_MODE') {
      window.localStorage.setItem(MOBILE_DOCK_MODE_STORAGE_KEY, action.payload);
    }
    rawUiDispatch(action);
  }, []);

  // 语言切换时：如果水印内容未自定义，跟随语言更新默认值
  const { i18n: i18nInstance } = useTranslation();
  const isCustomContent = ui.theme.watermark.isCustomContent;

  useEffect(() => {
    if (!isCustomContent) {
      const defaultContent = i18n.t('watermark.defaultContent', { ns: 'resume' });
      if (ui.theme.watermark.content !== defaultContent) {
        rawUiDispatch({
          type: 'SET_WATERMARK',
          payload: {
            content: defaultContent,
            isCustomContent: false,
          },
        });
      }
    }
  }, [i18nInstance.language, isCustomContent, ui.theme.watermark.content]);

  return (
    <AppUIContext.Provider value={{ ui, uiDispatch }}>
      {children}
    </AppUIContext.Provider>
  );
}

export function useAppUI() {
  const context = useContext(AppUIContext);
  if (!context) {
    throw new Error('useAppUI must be used within an AppProvider');
  }
  return context;
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { data, dispatch } = useResume();
  const { ui, uiDispatch } = useAppUI();
  const initialSnapshotRef = useRef<DocumentHistorySnapshot | null>(null);

  if (!initialSnapshotRef.current) {
    initialSnapshotRef.current = createDocumentSnapshot(data, ui.theme);
  }

  const historyRef = useRef<DocumentHistorySnapshot[]>([initialSnapshotRef.current]);
  const idxRef = useRef(0);
  const restoringToKeyRef = useRef<string | null>(null);
  const prevKeyRef = useRef(getSnapshotKey(initialSnapshotRef.current));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const currentSnapshotKey = getSnapshotKey({ data, theme: ui.theme });

  const updateButtons = useCallback(() => {
    setCanUndo(idxRef.current > 0);
    setCanRedo(idxRef.current < historyRef.current.length - 1);
  }, []);

  useEffect(() => {
    const restoringToKey = restoringToKeyRef.current;
    if (restoringToKey) {
      prevKeyRef.current = currentSnapshotKey;
      if (currentSnapshotKey === restoringToKey) {
        restoringToKeyRef.current = null;
      }
      updateButtons();
      return;
    }

    if (currentSnapshotKey === prevKeyRef.current) return;

    const nextSnapshot = createDocumentSnapshot(data, ui.theme);
    const nextHistory = [
      ...historyRef.current.slice(0, idxRef.current + 1),
      nextSnapshot,
    ];

    if (nextHistory.length > MAX_HISTORY) {
      nextHistory.shift();
    }

    historyRef.current = nextHistory;
    idxRef.current = nextHistory.length - 1;
    prevKeyRef.current = currentSnapshotKey;
    updateButtons();
  }, [currentSnapshotKey, data, ui.theme, updateButtons]);

  const restoreSnapshot = useCallback(
    (snapshot: DocumentHistorySnapshot) => {
      const nextSnapshot = deepClone(snapshot);
      restoringToKeyRef.current = getSnapshotKey(nextSnapshot);
      dispatch({ type: 'RESTORE_STATE', payload: nextSnapshot.data });
      uiDispatch({ type: 'SET_THEME', payload: nextSnapshot.theme });
      updateButtons();
    },
    [dispatch, uiDispatch, updateButtons],
  );

  const undo = useCallback(() => {
    if (idxRef.current <= 0) return;
    idxRef.current--;
    restoreSnapshot(historyRef.current[idxRef.current]);
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    if (idxRef.current >= historyRef.current.length - 1) return;
    idxRef.current++;
    restoreSnapshot(historyRef.current[idxRef.current]);
  }, [restoreSnapshot]);

  return (
    <HistoryContext.Provider value={{ undo, redo, canUndo, canRedo }}>
      {children}
    </HistoryContext.Provider>
  );
}
