import { useEffect, useRef, useState, useCallback, useMemo, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { SplitLayout } from '../../components/layout/SplitLayout';
import { useResume, useAppUI, useHistory } from '../../context/ResumeContext';
import { useConfirm } from '../../components/common/ConfirmModal';
import { triggerSave } from '../../components/common/SaveSync';
import { translateResumeToEnglish } from '../../api/ai';
import { useToast } from '../../components/common/Toast';
import { useDiagnosisContext } from '../../context/DiagnosisContext';
import { useAtsContext } from '../../context/AtsContext';
import { useAiTask, type ActiveAiTask } from '../../context/AiTaskContext';
import { TaskProgressDock, type TaskProgressStatus } from '../../components/common/TaskProgressDock';

export function aiTaskLabel(t: (key: string, options?: Record<string, unknown>) => string, task: Exclude<ActiveAiTask, null>) {
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

export function AtsProgressDock() {
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

export function EditorReadyLayout({
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

  useEffect(() => {
    const previousTitle = document.title;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const resumeName = ui.resumeMeta.name.trim() || t('unnamedResume');
    document.title = `${resumeName}｜布丁简历`;
  }, [t, ui.resumeMeta.name]);

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
      confirmVariant: 'theme',
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
      isTranslating,
      translationDisabled: activeAiTask !== null && activeAiTask !== 'translate',
      translationDisabledReason: activeAiTask ? t('aiTask.busy', { task: aiTaskLabel(t, activeAiTask) }) : undefined,
      onUndo: handleUndo,
      onRedo: redo,
      onZoomOut: handleZoomOut,
      onResetZoom: handleResetZoom,
      onZoomIn: handleZoomIn,
      onToggleAutoFit: handleToggleAutoFit,
      onFitToWidth: handleFitToWidth,
      onRunAiCheck: handleRunAiCheck,
      onOpenAts: handleOpenAts,
      onTranslateResume: handleTranslateResume,
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
      isTranslating,
      handleUndo,
      handleFitToWidth,
      handleOpenAts,
      handleTranslateResume,
      handleRunAiCheck,
      handleResetZoom,
      handleToggleAutoFit,
      handleZoomIn,
      handleZoomOut,
      isAutoFitting,
      redo,
      t,
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
