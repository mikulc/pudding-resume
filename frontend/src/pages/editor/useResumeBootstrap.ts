import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppUI, useResume } from '../../context/ResumeContext';
import { normalizeThemeSettings } from '../../types/resume';

export function useResumeBootstrap(resumeId?: string) {
  const { data, dataReady, initialSettings } = useResume();
  const { uiDispatch } = useAppUI();
  const personalInfoRef = useRef(data.personalInfo);
  personalInfoRef.current = data.personalInfo;
  const { t } = useTranslation('editor');
  // Track fade-in trigger — start invisible, animate in once dataReady becomes true
  const [fadeIn, setFadeIn] = useState(false);
  const [settingsApplied, setSettingsApplied] = useState(false);
  // ---- Apply imported settings (from JSON import) ----
  const applyImportedSettings = useCallback(() => {
    try {
      const raw = localStorage.getItem('pudding_imported_theme');
      if (!raw) return;
      const settings = JSON.parse(raw);
      if (settings && typeof settings === 'object') {
        uiDispatch({ type: 'SET_THEME', payload: normalizeThemeSettings(settings, personalInfoRef.current) });
        localStorage.removeItem('pudding_imported_theme');
      }
    } catch {
      localStorage.removeItem('pudding_imported_theme');
    }
  }, [uiDispatch]);

  useEffect(() => {
    // Check on mount
    applyImportedSettings();
    // Listen for real-time imports while editor is open
    window.addEventListener('pudding:import-settings', applyImportedSettings);
    return () => window.removeEventListener('pudding:import-settings', applyImportedSettings);
  }, [applyImportedSettings]);

  // Initialize resumeMeta from sessionStorage (copy flow) or backend (existing resume)
  useEffect(() => {
    const copyId = sessionStorage.getItem('resume_copy_id');
    const copyName = sessionStorage.getItem('resume_copy_name');
    if (copyId && copyName) {
      uiDispatch({
        type: 'SET_RESUME_META',
        payload: { id: copyId, name: copyName },
      });
      sessionStorage.removeItem('resume_copy_id');
      sessionStorage.removeItem('resume_copy_name');
      return;
    }

    // Existing resume selection from CreatePage
    // sessionStorage is NOT cleared here — ResumeProvider reads it to load content by ID
    const existingId = sessionStorage.getItem('existing_resume_id');
    const existingName = sessionStorage.getItem('existing_resume_name');
    if (existingId && existingName) {
      uiDispatch({
        type: 'SET_RESUME_META',
        payload: { id: existingId, name: existingName },
      });
      return;
    }

    // Template-based creation: ResumeProvider already loaded template data
    // from sessionStorage (if any) and removed blank_template_create.
    // Here we only need to set the resumeMeta name from sessionStorage
    // (template market flow) or keep id:null (blank template flow).
    if (sessionStorage.getItem('blank_template_create') === '1') {
      const templateName = sessionStorage.getItem('template_name');
      if (templateName) {
        uiDispatch({
          type: 'SET_RESUME_META',
          payload: { name: templateName },
        });
        sessionStorage.removeItem('template_name');
      }
      return;
    }

    // Blank template with pre-created DB record
    const blankId = sessionStorage.getItem('blank_template_id');
    const blankName = sessionStorage.getItem('blank_template_name');
    if (blankId && blankName) {
      uiDispatch({
        type: 'SET_RESUME_META',
        payload: { id: blankId, name: blankName },
      });
      sessionStorage.removeItem('blank_template_id');
      sessionStorage.removeItem('blank_template_name');
      return;
    }

    // URL-driven: resumeId from route param (direct access, no sessionStorage)
    if (resumeId) {
      const name = sessionStorage.getItem('existing_resume_name') || undefined;
      uiDispatch({
        type: 'SET_RESUME_META',
        payload: { id: resumeId, name: name || t('unnamedResume') },
      });
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore persisted style settings once resume data is loaded
  useEffect(() => {
    if (dataReady) {
      if (initialSettings) {
        uiDispatch({ type: 'SET_THEME', payload: normalizeThemeSettings(initialSettings, personalInfoRef.current) });
      }
      // Mark settings as applied so preview can render with the correct font
      // from the very first paint, avoiding a font-flash flicker.
      setSettingsApplied(true);
    }
  }, [dataReady, initialSettings, uiDispatch]);

  // Fade-in content once resume data is loaded AND settings applied
  useEffect(() => {
    if (dataReady && settingsApplied) {
      const timer = requestAnimationFrame(() => setFadeIn(true));
      return () => cancelAnimationFrame(timer);
    }
  }, [dataReady, settingsApplied]);


  return { fadeIn, settingsApplied };
}
