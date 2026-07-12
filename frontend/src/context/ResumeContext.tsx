import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResumeData, ResumeAction, AppUIState, AppUIAction, DEFAULT_THEME, DEFAULT_SECTION_ORDER, ThemeSettings, deriveCustomColors, SectionKey, RightPanelTab, MobileDockMode } from '../types/resume';
import { getLayoutDefaultColor } from '../registry/layouts';
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

const emptyResumeData: ResumeData = createEmptyResumeData();

function resumeReducer(state: ResumeData, action: ResumeAction): ResumeData {
  switch (action.type) {
    case 'SET_PERSONAL_INFO':
      return { ...state, personalInfo: { ...state.personalInfo, ...action.payload } };

    case 'ADD_EDUCATION':
      return { ...state, education: [...(state.education ?? []), action.payload] };

    case 'UPDATE_EDUCATION':
      return {
        ...state,
        education: (state.education ?? []).map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };

    case 'DELETE_EDUCATION':
      return {
        ...state,
        education: (state.education ?? []).filter((e) => e.id !== action.payload),
      };

    case 'SET_SKILLS':
      return { ...state, skills: action.payload };

    case 'ADD_WORK_EXPERIENCE':
      return { ...state, workExperience: [...(state.workExperience ?? []), action.payload] };

    case 'UPDATE_WORK_EXPERIENCE':
      return {
        ...state,
        workExperience: (state.workExperience ?? []).map((w) =>
          w.id === action.payload.id ? action.payload : w
        ),
      };

    case 'DELETE_WORK_EXPERIENCE':
      return {
        ...state,
        workExperience: (state.workExperience ?? []).filter((w) => w.id !== action.payload),
      };

    case 'SET_WORK_HIGHLIGHTS':
      return {
        ...state,
        workExperience: (state.workExperience ?? []).map((w) =>
          w.id === action.payload.workId
            ? { ...w, highlights: action.payload.highlights }
            : w
        ),
      };

    case 'ADD_PROJECT':
      return { ...state, projects: [...(state.projects ?? []), action.payload] };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: (state.projects ?? []).map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: (state.projects ?? []).filter((p) => p.id !== action.payload),
      };

    case 'SET_PROJECT_HIGHLIGHTS':
      return {
        ...state,
        projects: (state.projects ?? []).map((p) =>
          p.id === action.payload.projectId
            ? { ...p, highlights: action.payload.highlights }
            : p
        ),
      };

    case 'ADD_HONOR':
      return { ...state, honors: [...(state.honors ?? []), action.payload] };

    case 'UPDATE_HONOR':
      return {
        ...state,
        honors: (state.honors ?? []).map((h) =>
          h.id === action.payload.id ? action.payload : h
        ),
      };

    case 'DELETE_HONOR':
      return {
        ...state,
        honors: (state.honors ?? []).filter((h) => h.id !== action.payload),
      };

    case 'ADD_CERTIFICATION':
      return { ...state, certifications: [...(state.certifications ?? []), action.payload] };

    case 'UPDATE_CERTIFICATION':
      return {
        ...state,
        certifications: (state.certifications ?? []).map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case 'DELETE_CERTIFICATION':
      return {
        ...state,
        certifications: (state.certifications ?? []).filter((c) => c.id !== action.payload),
      };

    case 'ADD_PORTFOLIO':
      return { ...state, portfolio: [...(state.portfolio ?? []), action.payload] };

    case 'UPDATE_PORTFOLIO':
      return {
        ...state,
        portfolio: (state.portfolio ?? []).map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case 'DELETE_PORTFOLIO':
      return {
        ...state,
        portfolio: (state.portfolio ?? []).filter((p) => p.id !== action.payload),
      };

    case 'ADD_CUSTOM_SECTION':
      return {
        ...state,
        customSections: [...(state.customSections ?? []), { id: action.payload.id, name: action.payload.name, content: '' }],
        sectionOrder: [...(state.sectionOrder ?? DEFAULT_SECTION_ORDER), action.payload.id],
      };

    case 'UPDATE_CUSTOM_SECTION':
      return {
        ...state,
        customSections: (state.customSections ?? []).map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.updates } : s
        ),
      };

    case 'DELETE_CUSTOM_SECTION':
      return {
        ...state,
        customSections: (state.customSections ?? []).filter((s) => s.id !== action.payload),
        sectionOrder: (state.sectionOrder ?? []).filter((k) => k !== action.payload),
      };

    case 'UPDATE_SECTION_TITLE':
      return {
        ...state,
        sectionTitles: { ...(state.sectionTitles ?? {}), [action.payload.key]: action.payload.title },
      };

    case 'RESET_SECTION_TITLE': {
      if (!state.sectionTitles || !state.sectionTitles[action.payload]) return state;
      const next = { ...state.sectionTitles };
      delete next[action.payload];
      return { ...state, sectionTitles: Object.keys(next).length > 0 ? next : undefined };
    }

    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };

    case 'LOAD_DATA': {
      const payload = action.payload;
      return {
        personalInfo: {
          fullName: payload.personalInfo?.fullName ?? '',
          phone: payload.personalInfo?.phone ?? '',
          email: payload.personalInfo?.email ?? '',
          photoUrl: payload.personalInfo?.photoUrl ?? '',
          photoStyle: payload.personalInfo?.photoStyle,
          jobStatus: payload.personalInfo?.jobStatus ?? '',
          jobTarget: payload.personalInfo?.jobTarget ?? '',
          location: payload.personalInfo?.location ?? '',
          displayMode: payload.personalInfo?.displayMode ?? 'icon',
          photoLayout: payload.personalInfo?.photoLayout ?? 'right',
          hiddenFields: payload.personalInfo?.hiddenFields ?? [],
          fieldOrder: payload.personalInfo?.fieldOrder ?? undefined,
          customFields: payload.personalInfo?.customFields ?? {},
          iconMap: payload.personalInfo?.iconMap ?? {},
          fieldLabels: payload.personalInfo?.fieldLabels ?? {},
        },
        summary: payload.summary ?? '',
        education: payload.education ?? [],
        skills: Array.isArray(payload.skills) ? (payload.skills as string[]).map((s, i) => `${i + 1}. ${s}`).join('\n') : (payload.skills ?? ''),
        workExperience: (payload.workExperience ?? []).map(
          (w) => {
            const h = (w as { highlights?: string[] | string }).highlights;
            return {
              ...w,
              highlights: Array.isArray(h) ? h.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') : (h ?? ''),
            };
          }
        ) as ResumeData['workExperience'],
        projects: (payload.projects ?? []).map(
          (p) => {
            const h = (p as { highlights?: string[] | string }).highlights;
            return {
              ...p,
              highlights: Array.isArray(h) ? h.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') : (h ?? ''),
            };
          }
        ) as ResumeData['projects'],
        honors: (payload.honors ?? []).map(
          (h) => ({ ...h })
        ) as ResumeData['honors'],
        certifications: (payload.certifications ?? []).map(
          (c) => ({ ...c })
        ) as ResumeData['certifications'],
        portfolio: (payload.portfolio ?? []).map(
          (p) => ({ ...p })
        ) as ResumeData['portfolio'],
        customSections: (payload.customSections ?? []).map(
          (c) => ({ ...c })
        ),
        sectionOrder: payload.sectionOrder ?? DEFAULT_SECTION_ORDER,
        sectionTitles: payload.sectionTitles ?? {},
        hiddenSections: payload.hiddenSections ?? [],
      };
    }

    case 'REORDER_SECTIONS':
      return { ...state, sectionOrder: action.payload };

    case 'TOGGLE_SECTION_VISIBILITY': {
      const hidden = state.hiddenSections ?? [];
      const target = action.payload;
      const idx = hidden.indexOf(target);
      const newHidden = idx >= 0
        ? hidden.filter((k) => k !== target)
        : [...hidden, target];
      return { ...state, hiddenSections: newHidden };
    }

    case 'RESTORE_STATE':
      return action.payload;

    default:
      return state;
  }
}

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

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const MAX_HISTORY = 50;

interface DocumentHistorySnapshot {
  data: ResumeData;
  theme: ThemeSettings;
}

function createDocumentSnapshot(data: ResumeData, theme: ThemeSettings): DocumentHistorySnapshot {
  return deepClone({ data, theme });
}

function getSnapshotKey(snapshot: DocumentHistorySnapshot): string {
  return JSON.stringify(snapshot);
}

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

function appUIReducer(state: AppUIState, action: AppUIAction): AppUIState {
  switch (action.type) {
    case 'SET_ACTIVE_SECTION':
      return { ...state, activeSection: action.payload };
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.3, Math.min(1.5, action.payload)) };
    case 'TOGGLE_SETTINGS':
      return { ...state, settingsOpen: !state.settingsOpen };
    case 'SET_SETTINGS_OPEN':
      return { ...state, settingsOpen: action.payload };
    case 'TOGGLE_EDITOR':
      return { ...state, editorOpen: !state.editorOpen };
    case 'SET_EDITOR_OPEN':
      return { ...state, editorOpen: action.payload };
    case 'SET_THEME':
      return { ...state, theme: { ...state.theme, ...action.payload } };
    case 'SET_WATERMARK':
      return {
        ...state,
        theme: {
          ...state.theme,
          watermark: { ...state.theme.watermark, ...action.payload },
        },
      };
    case 'RESET_STYLE': {
      const defaultColor = getLayoutDefaultColor(state.theme.layoutId);
      return {
        ...state,
        theme: {
          ...DEFAULT_THEME,
          layoutId: state.theme.layoutId,
          colorTheme: 'custom',
          customColors: deriveCustomColors(defaultColor),
          watermark: {
            ...DEFAULT_THEME.watermark,
            content: i18n.t('watermark.defaultContent', { ns: 'resume' }),
            isCustomContent: false,
          },
        },
      };
    }
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload };
    case 'TRIGGER_SAVE_ANIMATION':
      return { ...state, saveStatus: 'saved', saveTrigger: state.saveTrigger + 1, lastSavedAt: Date.now() };
    case 'SET_DRAWER_OPEN':
      return { ...state, drawerOpen: action.payload, isSecondaryEditorOpen: action.payload };
    case 'SET_RESUME_META':
      return { ...state, resumeMeta: { ...state.resumeMeta, ...action.payload } };
    case 'SET_RIGHT_PANEL_TAB':
      return { ...state, rightPanelTab: action.payload };
    case 'SET_MOBILE_DOCK_MODE':
      return { ...state, mobileDockMode: action.payload };
    default:
      return state;
  }
}

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
