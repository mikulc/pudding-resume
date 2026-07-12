import { useEffect, useRef, useState, useCallback, useMemo, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExportProgressDock } from '../components/common/ExportProgressDock';
import { ResumeProvider, AppProvider, HistoryProvider, useResume, useAppUI, useHistory } from '../context/ResumeContext';
import { SplitLayout } from '../components/layout/SplitLayout';
import { useExportPDF } from '../hooks/useExportPDF';
import { useExportPNG } from '../hooks/useExportPNG';
import { useExportMarkdown } from '../hooks/useExportMarkdown';
import { useExportJSON } from '../hooks/useExportJSON';
import { LoginModal } from '../components/auth/LoginModal';
import { RegisterModal } from '../components/auth/RegisterModal';
import { useAuth, isLocalStorageEnabled } from '../context/AuthContext';
import { ExitConfirmProvider, useExitConfirm } from '../components/common/ExitConfirmDialog';
import { useConfirm } from '../components/common/ConfirmModal';
import { triggerSave } from '../components/common/SaveSync';
import { getAIConfig } from '../utils/aiConfig';
import { translateResumeToEnglish } from '../api/ai';

import { useToast } from '../components/common/Toast';
import { DiagnosisProvider, useDiagnosisContext } from '../context/DiagnosisContext';
import { AtsProvider, useAtsContext } from '../context/AtsContext';
import { AiTaskProvider, useAiTask, type ActiveAiTask } from '../context/AiTaskContext';
import { LongTextEditorProvider } from '../context/LongTextEditorContext';
import { FloatingEditorProvider } from '../context/FloatingEditorContext';
import { FontPreloader } from '../components/common/FontPreloader';
import { TaskProgressDock, type TaskProgressStatus } from '../components/common/TaskProgressDock';



function aiTaskLabel(t: (key: string, options?: Record<string, unknown>) => string, task: Exclude<ActiveAiTask, null>) {
  return t(`aiTask.${task}`);
}

function getAtsProgressDescription(
  stage: string | null,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  switch (stage) {
    case 'parsing':
      return t('atsPanel.progress.parsing');
    case 'keywords':
      return t('atsPanel.progress.keywords');
    case 'resume':
      return t('atsPanel.progress.resume');
    case 'matching':
      return t('atsPanel.progress.matching');
    case 'suggestions':
      return t('atsPanel.progress.suggestions');
    default:
      return t('atsPanel.progress.request');
  }
}

function getReadableAtsError(
  error: string | null,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (error === 'jobDescriptionTooShort') return t('atsPanel.jobDescriptionTooShort');
  if (!error) return t('atsPanel.error.failed');
  const looksTechnical = /(?:failed to parse|unexpected token|stack trace|<!doctype|\{\s*"|http\s*\d{3})/i.test(error);
  return looksTechnical ? t('atsPanel.error.failed') : error.slice(0, 180);
}

function AtsProgressDock() {
  const { t } = useTranslation('editor');
  const ats = useAtsContext();
  const { activeAiTask, requestAiTask, releaseAiTask } = useAiTask();
  const { showToast } = useToast();
  const [visibleStatus, setVisibleStatus] = useState<TaskProgressStatus | null>(ats.loading ? 'loading' : null);
  const previousLoadingRef = useRef(ats.loading);
  const previousErrorRef = useRef(ats.error);
  const handleClose = useCallback(() => setVisibleStatus(null), []);

  useEffect(() => {
    if (ats.loading) {
      setVisibleStatus('loading');
      previousLoadingRef.current = true;
      previousErrorRef.current = null;
      return;
    }

    if (previousLoadingRef.current) {
      setVisibleStatus(ats.error ? 'error' : 'success');
      previousLoadingRef.current = false;
      previousErrorRef.current = ats.error;
      return;
    }

    if (ats.error && ats.error !== previousErrorRef.current) {
      setVisibleStatus('error');
    }
    previousErrorRef.current = ats.error;
  }, [ats.error, ats.loading]);

  const handleRetry = useCallback(async () => {
    if (ats.loading) return;
    if (activeAiTask && activeAiTask !== 'ats') {
      showToast(t('aiTask.busy', { task: aiTaskLabel(t, activeAiTask) }), 'info');
      return;
    }
    if (!requestAiTask('ats')) return;
    try {
      await ats.runAnalysis();
    } finally {
      releaseAiTask('ats');
    }
  }, [activeAiTask, ats, releaseAiTask, requestAiTask, showToast, t]);

  if (!visibleStatus) return null;

  const isSuccess = visibleStatus === 'success';
  const isError = visibleStatus === 'error';
  const title = isSuccess
    ? t('atsPanel.progress.successTitle')
    : isError
      ? t('atsPanel.progress.errorTitle')
      : t('atsPanel.progress.title');
  const description = isSuccess
    ? t('atsPanel.progress.successDescription')
    : isError
      ? getReadableAtsError(ats.error, t)
      : getAtsProgressDescription(ats.progressStage, t);

  return (
    <TaskProgressDock
      visible
      taskType="ats"
      status={visibleStatus}
      title={title}
      description={description}
      progress={visibleStatus === 'loading' ? Math.min(90, ats.progress) : 100}
      excludeId="ats-progress-dock"
      onClose={handleClose}
      closeLabel={t('atsPanel.progress.close')}
      duration={isSuccess ? 1300 : undefined}
      actions={isError
        ? [{ label: t('atsPanel.progress.retry'), onClick: () => { void handleRetry(); }, variant: 'primary' }]
        : undefined}
    />
  );
}

interface EditorReadyLayoutProps {
  previewRef: RefObject<HTMLDivElement>;
  resumeId?: string;
  onBack: () => void;
  isExporting: boolean;
  isExportingPNG: boolean;
  isExportingMD: boolean;
  isExportingJSON: boolean;
  exportPDF: () => void;
  exportPNG: () => void;
  exportMarkdown: () => void;
  exportJSON: () => void;
  handlePageCountChange: (numPages: number) => void;
  autoFitActive: boolean;
  isAutoFitting: boolean;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleZoomIn: () => void;
  handleToggleAutoFit: () => void;
  handleFitToWidth: () => void;
  handleRunAiCheck: () => void;
}

function EditorReadyLayout({
  previewRef,
  resumeId,
  onBack,
  isExporting,
  isExportingPNG,
  isExportingMD,
  isExportingJSON,
  exportPDF,
  exportPNG,
  exportMarkdown,
  exportJSON,
  handlePageCountChange,
  autoFitActive,
  isAutoFitting,
  handleZoomOut,
  handleResetZoom,
  handleZoomIn,
  handleToggleAutoFit,
  handleFitToWidth,
  handleRunAiCheck,
}: EditorReadyLayoutProps) {
  const { ui, uiDispatch } = useAppUI();
  const { data, dispatch } = useResume();
  const { undo, redo, canUndo, canRedo } = useHistory();
  const { confirm } = useConfirm();
  const { t } = useTranslation('editor');
  const { activeAiTask, requestAiTask, releaseAiTask } = useAiTask();
  const diagnosis = useDiagnosisContext();
  const ats = useAtsContext();
  const latestDataRef = useRef(data);
  const translationUndoRef = useRef<{ after: string } | null>(null);
  const translateAbortRef = useRef<AbortController | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateTask, setTranslateTask] = useState<{
    visible: boolean;
    status: TaskProgressStatus;
    title: string;
    description: string;
    progress: number;
    actions?: 'success' | 'changed';
  } | null>(null);

  latestDataRef.current = data;

  const handleUndo = useCallback(() => {
    if (diagnosis.undoLastAction()) return;
    undo();
  }, [diagnosis, undo]);

  const handleOpenAts = useCallback(() => {
    if (activeAiTask && activeAiTask !== 'ats') {
      return;
    }
    uiDispatch({ type: 'SET_RIGHT_PANEL_TAB', payload: 'ats' });
    uiDispatch({ type: 'SET_SETTINGS_OPEN', payload: true });
    uiDispatch({ type: 'SET_MOBILE_DOCK_MODE', payload: 'settings' });
  }, [activeAiTask, uiDispatch]);

  useEffect(() => () => {
    translateAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!translateTask || translateTask.status === 'loading' || translateTask.actions) return;
    const timer = window.setTimeout(() => {
      setTranslateTask(null);
    }, translateTask.status === 'error' ? 4800 : 3200);
    return () => window.clearTimeout(timer);
  }, [translateTask]);

  const handleKeepTranslation = useCallback(() => {
    translationUndoRef.current = null;
    setTranslateTask(null);
  }, []);

  const handleUndoTranslation = useCallback(() => {
    const snapshot = translationUndoRef.current;
    if (!snapshot) {
      setTranslateTask(null);
      return;
    }

    const currentSnapshot = JSON.stringify(latestDataRef.current);
    if (currentSnapshot !== snapshot.after) {
      setTranslateTask({
        visible: true,
        status: 'error',
        title: t('translation.undoChangedTitle'),
        description: t('translation.undoChangedDescription'),
        progress: 100,
        actions: 'changed',
      });
      return;
    }

    flushSync(() => {
      undo();
    });
    translationUndoRef.current = null;
    setTranslateTask(null);
    void triggerSave();
  }, [t, undo]);

  const handleTranslateResume = useCallback(async () => {
    if (isTranslating) return;

    const confirmed = await confirm({
      title: t('translation.confirmTitle'),
      message: t('translation.confirmMessage'),
      confirmText: t('translation.confirmAction'),
      cancelText: t('translation.cancelAction'),
      confirmVariant: 'primary',
    });
    if (!confirmed) return;

    if (!requestAiTask('translate')) return;

    setIsTranslating(true);
    setTranslateTask({
      visible: true,
      status: 'loading',
      title: t('translation.loadingTitle'),
      description: t('translation.loadingDescription'),
      progress: 18,
    });

    try {
      const controller = new AbortController();
      translateAbortRef.current = controller;
      const result = await translateResumeToEnglish(
        latestDataRef.current,
        {
          onProgress: (event) => {
            setTranslateTask((current) => {
              if (!current || current.status !== 'loading') return current;
              return {
                ...current,
                description: t('translation.loadingDescription'),
                progress: Math.max(current.progress, event.progress ?? current.progress),
              };
            });
          },
        },
        controller.signal,
      );
      const afterSnapshot = JSON.stringify(result.resume_data);
      translationUndoRef.current = {
        after: afterSnapshot,
      };
      flushSync(() => {
        dispatch({ type: 'LOAD_DATA', payload: result.resume_data });
      });
      setTranslateTask({
        visible: true,
        status: 'success',
        title: t('translation.successTitle'),
        description: t('translation.successDescription'),
        progress: 100,
        actions: 'success',
      });
      void triggerSave();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : t('translation.fallbackError');
      translationUndoRef.current = null;
      setTranslateTask({
        visible: true,
        status: 'error',
        title: t('translation.errorTitle'),
        description: message,
        progress: 100,
      });
    } finally {
      translateAbortRef.current = null;
      setIsTranslating(false);
      releaseAiTask('translate');
    }
  }, [confirm, dispatch, isTranslating, releaseAiTask, requestAiTask, t]);

  const confirmAtsBeforeExport = useCallback(async () => {
    if (!ats.result || ats.result.score >= 60) return true;
    return confirm({
      title: t('atsPanel.exportConfirm.title'),
      message: t('atsPanel.exportConfirm.message', { score: ats.result.score }),
      confirmText: t('atsPanel.exportConfirm.confirm'),
      cancelText: t('atsPanel.exportConfirm.cancel'),
      confirmVariant: 'primary',
    });
  }, [ats.result, confirm, t]);

  const guardedExportPDF = useCallback(async () => {
    if (await confirmAtsBeforeExport()) exportPDF();
  }, [confirmAtsBeforeExport, exportPDF]);

  const guardedExportPNG = useCallback(async () => {
    if (await confirmAtsBeforeExport()) exportPNG();
  }, [confirmAtsBeforeExport, exportPNG]);

  const canvasToolbar = useMemo(
    () => ({
      zoom: ui.zoom,
      canUndo: canUndo || diagnosis.canUndoLastAction,
      canRedo,
      autoFitActive,
      isAutoFitting,
      aiHasResults: diagnosis.hasResults,
      aiItemCount: diagnosis.items.length,
      aiLoading: diagnosis.loading,
      atsHasResults: ats.hasResults,
      atsLoading: ats.loading,
      activeAiTask,
      onUndo: handleUndo,
      onRedo: redo,
      onZoomOut: handleZoomOut,
      onResetZoom: handleResetZoom,
      onZoomIn: handleZoomIn,
      onToggleAutoFit: handleToggleAutoFit,
      onFitToWidth: handleFitToWidth,
      onRunAiCheck: handleRunAiCheck,
      onOpenAts: handleOpenAts,
    }),
    [
      autoFitActive,
      canRedo,
      canUndo,
      diagnosis.canUndoLastAction,
      diagnosis.hasResults,
      diagnosis.items.length,
      diagnosis.loading,
      ats.hasResults,
      ats.loading,
      activeAiTask,
      handleUndo,
      handleFitToWidth,
      handleOpenAts,
      handleRunAiCheck,
      handleResetZoom,
      handleToggleAutoFit,
      handleZoomIn,
      handleZoomOut,
      isAutoFitting,
      redo,
      ui.zoom,
    ],
  );

  return (
    <>
    <SplitLayout
      previewRef={previewRef}
      resumeId={resumeId}
      onBack={onBack}
      isExporting={isExporting}
      isExportingPNG={isExportingPNG}
      isExportingMD={isExportingMD}
      isExportingJSON={isExportingJSON}
      onExportPDF={() => { void guardedExportPDF(); }}
      onExportPNG={() => { void guardedExportPNG(); }}
      onExportMD={exportMarkdown}
      onExportJSON={exportJSON}
      isTranslating={isTranslating}
      onTranslateResume={handleTranslateResume}
      translationDisabled={activeAiTask !== null && activeAiTask !== 'translate'}
      translationDisabledReason={activeAiTask ? t('aiTask.busy', { task: aiTaskLabel(t, activeAiTask) }) : undefined}
      onPageCountChange={handlePageCountChange}
      canvasToolbar={canvasToolbar}
    />
    {translateTask && (
      <TaskProgressDock
        visible={translateTask.visible}
        taskType="translate"
        status={translateTask.status}
        title={translateTask.title}
        description={translateTask.description}
        progress={translateTask.progress}
        excludeId="translate-progress-dock"
        actions={translateTask.actions === 'success'
          ? [
              { label: t('translation.undoAction'), onClick: handleUndoTranslation, variant: 'secondary' },
              { label: t('translation.keepAction'), onClick: handleKeepTranslation, variant: 'primary' },
            ]
          : translateTask.actions === 'changed'
            ? [
                { label: t('translation.keepAction'), onClick: handleKeepTranslation, variant: 'primary' },
              ]
            : undefined}
      />
    )}
    <AtsProgressDock />
    </>
  );
}


function EditorContent({ resumeId }: { resumeId?: string }) {
  const navigate = useNavigate();
  const { previewRef, exportPDF, isExporting, exportProgress: pdfExportProgress } = useExportPDF();
  const { exportPNG, isExportingPNG, exportProgress: pngExportProgress } = useExportPNG(previewRef);
  const { exportMarkdown, isExportingMD } = useExportMarkdown();
  const { exportJSON, isExportingJSON } = useExportJSON();
  const { dataReady, initialSettings } = useResume();
  const { isLoggedIn } = useAuth();
  const { ui, uiDispatch } = useAppUI();
  const diagnosis = useDiagnosisContext();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { t } = useTranslation('editor');
  const { activeAiTask, requestAiTask, releaseAiTask } = useAiTask();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  // Track fade-in trigger — start invisible, animate in once dataReady becomes true
  const [fadeIn, setFadeIn] = useState(false);
  const [settingsApplied, setSettingsApplied] = useState(false);
  // ---- Auto-fit state machine ----
  const AUTO_FIT_MIN_PAGE_MARGIN = 10;
  const AUTO_FIT_MIN_LINE_SPACING = 1.2;
  const AUTO_FIT_MIN_FONT_SIZE = 11;
  const AUTO_FIT_PAGE_MARGIN_STEP = 1;
  const AUTO_FIT_LINE_SPACING_STEP = 0.1;
  const AUTO_FIT_FONT_SIZE_STEP = 1;
  type AutoFitPhase = 'idle' | 'pagemargin' | 'linespacing' | 'fontsize';
  interface AutoFitState {
    phase: AutoFitPhase;
    originalSettings: { pageMargin: number; lineSpacing: number; fontSize: number } | null;
  }
  const autoFitRef = useRef<AutoFitState>({ phase: 'idle', originalSettings: null });
  const pageCountRef = useRef(0);
  const [measureTick, setMeasureTick] = useState(0);
  const [isAutoFitting, setIsAutoFitting] = useState(false);
  const [autoFitActive, setAutoFitActive] = useState(false);
  // 稳定引用，始终指向最新的 doNextStep
  const doNextStepRef = useRef<() => void>(() => {});

  const finishAutoFitAtMinimum = useCallback(() => {
    autoFitRef.current.phase = 'idle';
    setIsAutoFitting(false);
    setAutoFitActive(true);
    showToast(t('autoFitMinReached'), 'error');
  }, [showToast, t]);

  // ---- Apply imported settings (from JSON import) ----
  const applyImportedSettings = useCallback(() => {
    try {
      const raw = localStorage.getItem('pudding_imported_theme');
      if (!raw) return;
      const settings = JSON.parse(raw);
      if (settings && typeof settings === 'object') {
        uiDispatch({ type: 'SET_THEME', payload: settings });
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

  // ---- Exit confirmation: dirty detection ----
  const isDirty = ui.saveStatus !== 'saved';

  // Exit confirm dialog
  const { exitConfirm } = useExitConfirm();

  // Guard refs for browser back/forward interception
  const guardPushedRef = useRef(false);
  const dialogOpenRef = useRef(false);
  const leavingRef = useRef(false);


  // Intercept browser back/forward when dirty
  useEffect(() => {
    if (!isDirty) {
      // Clean up stale guard entry from history when the resume becomes saved
      if (guardPushedRef.current) {
        guardPushedRef.current = false;
        // Pop the guard entry silently (same URL, no visual change to user)
        window.history.back();
      }
      return;
    }

    // Push a single guard entry so browser back lands on it first
    if (!guardPushedRef.current) {
      window.history.pushState({ __exitGuard: true }, '', window.location.href);
      guardPushedRef.current = true;
    }

    const handlePopState = (_e: PopStateEvent) => {
      if (leavingRef.current) return;

      // If the guard entry is being popped, user is trying to leave via browser back.
      // dialogOpenRef check prevents re-entry when navigateAway() calls navigate(-2).
      if (!dialogOpenRef.current) {
        dialogOpenRef.current = true;
        exitConfirm({ isLoggedIn, localStoragePath: isLocalStorageEnabled() ? 'local' : '' }).then(async (choice) => {
          try {
            if (choice === 'save') {
              const saved = await triggerSave();
              if (!saved) {
                window.history.forward();
                return;
              }
              guardPushedRef.current = false;
              leavingRef.current = true;
              // Guard was just popped by browser back, so -1 goes to previous page
              navigate(-1);
            } else if (choice === 'discard') {
              guardPushedRef.current = false;
              leavingRef.current = true;
              // Guard was just popped by browser back, so -1 goes to previous page
              navigate(-1);
            } else {
              // Browser back already popped the guard entry. If the user cancels,
              // move forward to restore it as the current entry so later app-level
              // back actions still calculate the history offset correctly.
              window.history.forward();
            }
          } finally {
            dialogOpenRef.current = false;
          }
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, exitConfirm, isLoggedIn, navigate]);

  const navigateBackFromToolbar = useCallback(async () => {
    if (dialogOpenRef.current) return;

    if (!isDirty) {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/resumes');
      }
      return;
    }

    dialogOpenRef.current = true;
    try {
      const choice = await exitConfirm({
        isLoggedIn,
        localStoragePath: isLocalStorageEnabled() ? 'local' : '',
      });

      if (choice === 'cancel') return;

      if (choice === 'save') {
        const saved = await triggerSave();
        if (!saved) return;
      }

      guardPushedRef.current = false;
      leavingRef.current = true;

      if (window.history.length > 2) {
        navigate(-2);
      } else {
        navigate('/resumes', { replace: true });
      }
    } finally {
      dialogOpenRef.current = false;
    }
  }, [exitConfirm, isDirty, isLoggedIn, navigate]);

  // beforeunload: warn when closing/refreshing browser tab with unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // 全局快捷键 Ctrl+P：导出 PDF
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框内的快捷键，避免干扰文本框编辑
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (!isExporting) {
          exportPDF();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [exportPDF, isExporting]);

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
        uiDispatch({ type: 'SET_THEME', payload: initialSettings });
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

  // ---- Zoom controls ----
  const setZoom = useCallback(
    (newZoom: number) => uiDispatch({ type: 'SET_ZOOM', payload: newZoom }),
    [uiDispatch],
  );
  const handleZoomIn = useCallback(() => setZoom(Math.min(1.5, ui.zoom + 0.1)), [ui.zoom, setZoom]);
  const handleZoomOut = useCallback(() => setZoom(Math.max(0.3, ui.zoom - 0.1)), [ui.zoom, setZoom]);
  const handleResetZoom = useCallback(() => setZoom(1), [setZoom]);
  const handleFitToWidth = useCallback(() => {
    // 由 PreviewPanel 覆盖实现，此处提供 noop 以满足类型要求
  }, []);

  // ---- Auto-fit: page count callback from preview ----
  const handlePageCountChange = useCallback((numPages: number) => {
    pageCountRef.current = numPages;
    setMeasureTick((t) => t + 1);
  }, []);

  // ---- Auto-fit: execute next adjustment step ----
  const doNextStep = useCallback(() => {
    const state = autoFitRef.current;
    if (state.phase === 'idle' || !state.originalSettings) return;

    const { theme } = ui;

    if (state.phase === 'pagemargin') {
      if (theme.pageMargin > AUTO_FIT_MIN_PAGE_MARGIN) {
        uiDispatch({
          type: 'SET_THEME',
          payload: { pageMargin: Math.max(AUTO_FIT_MIN_PAGE_MARGIN, theme.pageMargin - AUTO_FIT_PAGE_MARGIN_STEP) },
        });
        return;
      }
      autoFitRef.current.phase = 'linespacing';
    }

    if (autoFitRef.current.phase === 'linespacing') {
      if (theme.lineSpacing > AUTO_FIT_MIN_LINE_SPACING) {
        uiDispatch({
          type: 'SET_THEME',
          payload: {
            lineSpacing: Math.max(
              AUTO_FIT_MIN_LINE_SPACING,
              +(theme.lineSpacing - AUTO_FIT_LINE_SPACING_STEP).toFixed(1),
            ),
          },
        });
        return;
      }
      autoFitRef.current.phase = 'fontsize';
    }

    if (autoFitRef.current.phase === 'fontsize') {
      if (theme.fontSize > AUTO_FIT_MIN_FONT_SIZE) {
        uiDispatch({
          type: 'SET_THEME',
          payload: { fontSize: Math.max(AUTO_FIT_MIN_FONT_SIZE, theme.fontSize - AUTO_FIT_FONT_SIZE_STEP) },
        });
        return;
      }
      // 全部参数已到最小值，停留在当前压缩结果，等待用户再次点击恢复
      finishAutoFitAtMinimum();
    }
  }, [finishAutoFitAtMinimum, ui, uiDispatch]);

  // 保持 doNextStepRef 同步到最新
  useEffect(() => {
    doNextStepRef.current = doNextStep;
  }, [doNextStep]);

  // ---- Auto-fit: 监听测量回调驱动状态机 ----
  useEffect(() => {
    const state = autoFitRef.current;
    if (state.phase === 'idle' || !state.originalSettings) return;

    if (pageCountRef.current <= 1) {
      // 成功适配一页！保持开关激活状态，保留原始设置以便后续关闭恢复
      autoFitRef.current.phase = 'idle';
      setIsAutoFitting(false);
      setAutoFitActive(true);
      showToast(t('autoFitDone'), 'success');
      return;
    }

    // 仍多页，继续下一步调整
    doNextStepRef.current();
  }, [measureTick, showToast, t]);

  // ---- Auto-fit: 开关切换 ----
  const handleToggleAutoFit = useCallback(() => {
    if (autoFitActive) {
      // 关闭：还原原始设置
      const orig = autoFitRef.current.originalSettings;
      if (orig) {
        uiDispatch({ type: 'SET_THEME', payload: orig });
      }
      autoFitRef.current = { phase: 'idle', originalSettings: null };
      setIsAutoFitting(false);
      setAutoFitActive(false);
      showToast(t('autoFitRestored'), 'success');
      return;
    }

    // 开启：当前测量结果已是一页则无需调整
    if (pageCountRef.current <= 1) {
      setAutoFitActive(true);
      showToast(t('autoFitAlreadyOne'), 'success');
      return;
    }

    const { theme } = ui;
    const orig = {
      pageMargin: theme.pageMargin,
      lineSpacing: theme.lineSpacing,
      fontSize: theme.fontSize,
    };

    autoFitRef.current = {
      phase: 'pagemargin',
      originalSettings: orig,
    };
    setIsAutoFitting(true);
    setAutoFitActive(true);

    // 首次调整：按优先级选择第一个可调的参数
    if (theme.pageMargin > AUTO_FIT_MIN_PAGE_MARGIN) {
      uiDispatch({
        type: 'SET_THEME',
        payload: { pageMargin: Math.max(AUTO_FIT_MIN_PAGE_MARGIN, theme.pageMargin - AUTO_FIT_PAGE_MARGIN_STEP) },
      });
    } else if (theme.lineSpacing > AUTO_FIT_MIN_LINE_SPACING) {
      autoFitRef.current.phase = 'linespacing';
      uiDispatch({
        type: 'SET_THEME',
        payload: {
          lineSpacing: Math.max(
            AUTO_FIT_MIN_LINE_SPACING,
            +(theme.lineSpacing - AUTO_FIT_LINE_SPACING_STEP).toFixed(1),
          ),
        },
      });
    } else if (theme.fontSize > AUTO_FIT_MIN_FONT_SIZE) {
      autoFitRef.current.phase = 'fontsize';
      uiDispatch({
        type: 'SET_THEME',
        payload: { fontSize: Math.max(AUTO_FIT_MIN_FONT_SIZE, theme.fontSize - AUTO_FIT_FONT_SIZE_STEP) },
      });
    } else {
        // 页面设置已为最小值，无法自动调整为一页
      finishAutoFitAtMinimum();
    }
  }, [autoFitActive, finishAutoFitAtMinimum, ui, uiDispatch, showToast, t]);

  const handleRunAiCheck = useCallback(async () => {
    if (diagnosis.loading) return;

    if (diagnosis.hasResults) {
      const confirmed = await confirm({
        title: t('diagnosisPanel.clearConfirm.title'),
        message: t('diagnosisPanel.clearConfirm.message'),
        confirmText: t('diagnosisPanel.clearConfirm.confirm'),
        cancelText: t('diagnosisPanel.clearConfirm.cancel'),
        confirmVariant: 'danger',
      });
      if (confirmed) {
        diagnosis.clearDiagnosis();
      }
      return;
    }

    // 未登录用户必须配置自定义 AI API 才能使用诊断功能
    if (!isLoggedIn) {
      const aiConfig = getAIConfig();
      if (aiConfig.modelSource !== 'custom' || !aiConfig.baseUrl.trim() || !aiConfig.apiKey.trim()) {
        showToast(t('diagnosisError.aiNotConfigured'), 'info');
        return;
      }
    }

    if (activeAiTask && activeAiTask !== 'diagnosis') {
      showToast(t('aiTask.busy', { task: aiTaskLabel(t, activeAiTask) }), 'info');
      return;
    }

    const confirmed = await confirm({
      title: t('diagnosisPanel.runConfirm.title'),
      message: t('diagnosisPanel.runConfirm.message'),
      confirmText: t('diagnosisPanel.runConfirm.confirm'),
      cancelText: t('diagnosisPanel.runConfirm.cancel'),
      confirmVariant: 'primary',
    });
    if (!confirmed) return;

    if (!requestAiTask('diagnosis')) return;
    try {
      const completed = await diagnosis.runDiagnosis();
      if (completed) {
        showToast(t('diagnosisComplete'), 'success');
      }
    } finally {
      releaseAiTask('diagnosis');
    }
  }, [activeAiTask, confirm, diagnosis, releaseAiTask, requestAiTask, showToast, t, isLoggedIn]);

  return (
    <div id="editor-root" className="theme-transition-target h-screen flex flex-col overflow-hidden">
      <FontPreloader fontFamilyId={ui.theme.fontFamily} />




      {/* Main content */}
      <div
        id="editor-main-content"
        className="theme-transition-target flex-1 min-h-0 overflow-hidden transition-opacity duration-200"
        style={{ opacity: fadeIn ? 1 : 0 }}
      >
        {dataReady && settingsApplied ? (
          <HistoryProvider>
            <EditorReadyLayout
              previewRef={previewRef}
              resumeId={ui.resumeMeta.id ?? undefined}
              onBack={navigateBackFromToolbar}
              isExporting={isExporting}
              isExportingPNG={isExportingPNG}
              isExportingMD={isExportingMD}
              isExportingJSON={isExportingJSON}
              exportPDF={exportPDF}
              exportPNG={exportPNG}
              exportMarkdown={exportMarkdown}
              exportJSON={exportJSON}
              handlePageCountChange={handlePageCountChange}
              autoFitActive={autoFitActive}
              isAutoFitting={isAutoFitting}
              handleZoomOut={handleZoomOut}
              handleResetZoom={handleResetZoom}
              handleZoomIn={handleZoomIn}
              handleToggleAutoFit={handleToggleAutoFit}
              handleFitToWidth={handleFitToWidth}
              handleRunAiCheck={handleRunAiCheck}
            />
          </HistoryProvider>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #e9d5ff', borderTopColor: '#8b5cf6' }} />
              <span className="text-sm text-gray-400">{t('loadingResume')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Auth modals for banner login/register */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true); }}
      />
      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true); }}
      />
      <ExportProgressDock progress={pdfExportProgress ?? pngExportProgress} />
    </div>
  );
}

export default function EditorPage() {
  const { resumeId } = useParams<{ resumeId?: string }>();
  const editorKey = resumeId ?? 'new-resume';

  return (
    <ResumeProvider key={editorKey} resumeId={resumeId}>
      <AppProvider>
        <LongTextEditorProvider>
          <FloatingEditorProvider>
            <DiagnosisProvider>
              <AtsProvider resumeId={resumeId}>
                <AiTaskProvider>
                  <ExitConfirmProvider>
                    <EditorContent resumeId={resumeId} />
                  </ExitConfirmProvider>
                </AiTaskProvider>
              </AtsProvider>
            </DiagnosisProvider>
          </FloatingEditorProvider>
        </LongTextEditorProvider>
      </AppProvider>
    </ResumeProvider>
  );
}
