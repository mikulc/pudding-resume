import React,{ createContext,useCallback,useContext,useEffect,useReducer,useState } from 'react';
import { getResumeById } from '../../api/resumes';
import { ResumeAction,ResumeData,ThemeSettings } from '../../types/resume';
import { getAuthToken } from '../../utils/api';
import { loadLocalResumes } from '../../utils/localStorage';
import { getPreviewCache } from '../../utils/previewCache';
import { createEmptyResumeData,createInitialThemeSettings } from '../../utils/resumeDraft';
import {
clearDraftResumeLaunch,
clearExistingResumeLaunch,
clearLocalResumeLaunch,
readDraftResumeLaunch,
readExistingResumeLaunchId,
readLocalResumeLaunch,
} from '../../utils/resumeLaunch';

import { resumeReducer } from '../../features/resume/model/resumeReducer';
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

export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
}
