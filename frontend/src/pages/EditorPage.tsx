import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExportProgressDock } from '../components/common/ExportProgressDock';
import { ResumeProvider, AppProvider, HistoryProvider, useResume, useAppUI } from '../context/ResumeContext';
import { useExportPDF } from '../hooks/useExportPDF';
import { useExportPNG } from '../hooks/useExportPNG';
import { useExportMarkdown } from '../hooks/useExportMarkdown';
import { useExportJSON } from '../hooks/useExportJSON';
import { LoginModal } from '../components/auth/LoginModal';
import { RegisterModal } from '../components/auth/RegisterModal';
import { useAuth } from '../context/AuthContext';
import { ExitConfirmProvider } from '../components/common/ExitConfirmDialog';
import { useConfirm } from '../components/common/ConfirmModal';
import { getAIConfig } from '../utils/aiConfig';

import { useToast } from '../components/common/Toast';
import { DiagnosisProvider, useDiagnosisContext } from '../context/DiagnosisContext';
import { AtsProvider } from '../context/AtsContext';
import { AiTaskProvider, useAiTask } from '../context/AiTaskContext';
import { LongTextEditorProvider } from '../context/LongTextEditorContext';
import { FloatingEditorProvider } from '../context/FloatingEditorContext';
import { FontPreloader } from '../components/common/FontPreloader';
import { aiTaskLabel, EditorReadyLayout } from './editor/EditorShell';
import { useEditorLeaveGuard } from './editor/useEditorLeaveGuard';
import { useResumeBootstrap } from './editor/useResumeBootstrap';
import { useAutoFitResume } from './editor/useAutoFitResume';

function EditorContent({ resumeId }: { resumeId?: string }) {
  const navigate = useNavigate();
  const { previewRef, exportPDF, isExporting, exportProgress: pdfExportProgress } = useExportPDF();
  const { exportPNG, isExportingPNG, exportProgress: pngExportProgress } = useExportPNG(previewRef);
  const { exportMarkdown, isExportingMD } = useExportMarkdown();
  const { exportJSON, isExportingJSON } = useExportJSON();
  const { dataReady } = useResume();
  const { isLoggedIn } = useAuth();
  const { ui } = useAppUI();
  const diagnosis = useDiagnosisContext();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { t } = useTranslation('editor');
  const { activeAiTask, requestAiTask, releaseAiTask } = useAiTask();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const { fadeIn, settingsApplied } = useResumeBootstrap(resumeId);
  const {
    autoFitActive, isAutoFitting, handlePageCountChange, handleZoomOut,
    handleResetZoom, handleZoomIn, handleToggleAutoFit, handleFitToWidth,
  } = useAutoFitResume();

  const { navigateBackFromToolbar } = useEditorLeaveGuard({
    isDirty: ui.saveStatus !== 'saved', isLoggedIn, navigate,
  });

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
      if (!aiConfig.baseUrl.trim() || !aiConfig.apiKey.trim()) {
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
