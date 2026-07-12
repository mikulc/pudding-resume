import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, Languages, Loader2, PencilLine, Settings2, Target } from 'lucide-react';
import { EditorPanel } from './EditorPanel';
import { PreviewPanel } from './PreviewPanel';
import { RightPanel } from './RightPanel';
import { Tooltip } from '../common/Tooltip';
import { useAppUI } from '../../context/ResumeContext';
import { SaveStatusIndicator } from '../common/SaveStatusIndicator';
import { SaveSync, triggerSave } from '../common/SaveSync';
import { ShareDropdown } from '../share/ShareDropdown';
import { useGoBack } from '../../hooks/useGoBack';
import { ExportDropdown } from './ExportDropdown';
import type { CanvasToolbarActions } from '../preview/CanvasFloatingToolbar';
import type { MobileDockMode } from '../../types/resume';

interface SplitLayoutProps {
  previewRef: React.RefObject<HTMLDivElement>;
  resumeId?: string;
  onBack?: () => void;
  isExporting: boolean;
  isExportingPNG: boolean;
  isExportingMD: boolean;
  isExportingJSON: boolean;
  onExportPDF: () => void;
  onExportPNG: () => void;
  onExportMD: () => void;
  onExportJSON: () => void;
  isTranslating: boolean;
  translationDisabled?: boolean;
  translationDisabledReason?: string;
  onTranslateResume: () => void;
  onPageCountChange?: (numPages: number) => void;
  canvasToolbar: CanvasToolbarActions;
}

const MOBILE_LAYOUT_QUERY = '(max-width: 768px)';
const EDITOR_PANEL_DEFAULT_WIDTH = 301;
const RIGHT_PANEL_WIDTH = 301;

const MOBILE_DOCK_ITEMS: Array<{ id: MobileDockMode; labelKey: string; icon: typeof PencilLine }> = [
  { id: 'edit', labelKey: 'mobileDock.edit', icon: PencilLine },
  { id: 'settings', labelKey: 'mobileDock.settings', icon: Settings2 },
  { id: 'preview', labelKey: 'mobileDock.preview', icon: Eye },
];

function useIsMobileLayout() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
  });

  useEffect(() => {
    const query = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const handleChange = () => setIsMobile(query.matches);

    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

export function SplitLayout({ previewRef, resumeId, onBack, isExporting, isExportingPNG, isExportingMD, isExportingJSON, onExportPDF, onExportPNG, onExportMD, onExportJSON, isTranslating, translationDisabled = false, translationDisabledReason, onTranslateResume, onPageCountChange, canvasToolbar }: SplitLayoutProps) {
  const { ui, uiDispatch } = useAppUI();
  const { t } = useTranslation('editor');
  const isMobileLayout = useIsMobileLayout();
  const fallbackGoBack = useGoBack('/resumes');
  const goBack = onBack ?? fallbackGoBack;
  const translateLabel = isTranslating ? t('translating') : t('translate');
  const translateTooltip = translationDisabled && !isTranslating && translationDisabledReason
    ? translationDisabledReason
    : translateLabel;

  const translateButton = (compact = false) => (
    <Tooltip content={translateTooltip}>
      <button
        type="button"
        onClick={onTranslateResume}
        disabled={isTranslating || translationDisabled}
        aria-label={translateLabel}
        className={[
          'editor-action-button editor-action-button--tertiary',
          compact ? 'editor-action-button--compact' : '',
        ].join(' ')}
      >
        {isTranslating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Languages className="h-3.5 w-3.5" />
        )}
        {!compact && <span>{t('translate')}</span>}
      </button>
    </Tooltip>
  );

  return (
    <SaveSync>
      <div className="theme-transition-target h-full flex flex-col overflow-hidden bg-slate-50">
        <style>{`
          @keyframes float-bounce-in {
            0%   { transform: translateX(48px); opacity: 0; }
            60%  { transform: translateX(-12px); opacity: 1; }
            80%  { transform: translateX(6px); }
            100% { transform: translateX(0px); }
          }
          @keyframes float-bounce-in-right {
            0%   { transform: translateX(-48px); opacity: 0; }
            60%  { transform: translateX(12px); opacity: 1; }
            80%  { transform: translateX(-6px); }
            100% { transform: translateX(0px); }
          }
          .animate-float-bounce-in {
            animation: float-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
          .animate-float-bounce-in-right {
            animation: float-bounce-in-right 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
        `}</style>

        {isMobileLayout ? (
          <div className="theme-transition-target mobile-editor-shell h-full min-h-0 flex flex-col overflow-hidden bg-slate-50">
            <header className="global-editor-topbar mobile-editor-topbar theme-transition-target no-print">
              <div className="global-editor-topbar__left">
                <Tooltip content={t('back')}>
                  <button
                    type="button"
                    onClick={goBack}
                    className="global-editor-topbar__back theme-color-transition"
                    aria-label={t('back')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </Tooltip>

                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="min-w-0 truncate text-sm font-semibold text-gray-800 dark:text-[color:var(--text-primary)]">
                    {ui.resumeMeta.name}
                  </span>
                  <div className="h-3.5 w-px flex-shrink-0 bg-gray-200 dark:bg-[color:var(--border-soft)]" />
                  <SaveStatusIndicator
                    saveStatus={ui.saveStatus}
                    saveTrigger={ui.saveTrigger}
                    lastSavedAt={ui.lastSavedAt}
                    onManualSave={() => { void triggerSave(); }}
                    compact
                  />
                </div>
              </div>

              <div className="global-editor-topbar__actions">
                {translateButton(true)}
                <ShareDropdown resumeId={resumeId ?? null} compact />
                <ExportDropdown
                  isExportingPDF={isExporting}
                  isExportingPNG={isExportingPNG}
                  isExportingMD={isExportingMD}
                  isExportingJSON={isExportingJSON}
                  onExportPDF={onExportPDF}
                  onExportPNG={onExportPNG}
                  onExportMD={onExportMD}
                  onExportJSON={onExportJSON}
                  compact
                />
              </div>
            </header>

            <div className="theme-transition-target mobile-editor-layout relative flex-1 min-h-0 overflow-hidden bg-slate-50">
              <section
                className={ui.mobileDockMode === 'edit' ? 'h-full overflow-hidden mobile-panel-scroll mobile-form-pane' : 'hidden h-full overflow-hidden mobile-form-pane'}
                aria-hidden={ui.mobileDockMode !== 'edit'}
              >
                <div className="mobile-form-shell mobile-editor-form-shell">
                  <EditorPanel isMobile />
                </div>
              </section>

              <section
                className={ui.mobileDockMode === 'settings' ? 'h-full overflow-hidden mobile-panel-scroll mobile-form-pane' : 'hidden h-full overflow-hidden mobile-form-pane'}
                aria-hidden={ui.mobileDockMode !== 'settings'}
              >
                <div className="mobile-form-shell mobile-editor-form-shell">
                  <RightPanel isMobile />
                </div>
              </section>

              <section
                className={ui.mobileDockMode === 'preview' ? 'h-full overflow-hidden' : 'hidden h-full overflow-hidden'}
                aria-hidden={ui.mobileDockMode !== 'preview'}
              >
                <PreviewPanel
                  previewRef={previewRef}
                  resumeId={resumeId}
                  isExporting={isExporting}
                  isExportingPNG={isExportingPNG}
                  isExportingMD={isExportingMD}
                  isExportingJSON={isExportingJSON}
                  onExportPDF={onExportPDF}
                  onExportPNG={onExportPNG}
                  onExportMD={onExportMD}
                  onExportJSON={onExportJSON}
                  onPageCountChange={onPageCountChange}
                  canvasToolbar={canvasToolbar}
                  isMobile
                  isActive={ui.mobileDockMode === 'preview'}
                />
              </section>

              <nav
                className="no-print pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 bg-transparent"
                style={{ bottom: 'max(env(safe-area-inset-bottom), 8px)' }}
                aria-label={t('mobileDock.aria')}
              >
                <div
                  className="theme-transition-target pointer-events-auto inline-flex h-[60px] max-w-[380px] items-center gap-1.5 rounded-[30px] border border-white/60 bg-white/45 px-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.68)] ring-1 ring-slate-900/5 backdrop-blur-2xl"
                  style={{ WebkitBackdropFilter: 'blur(24px) saturate(1.35)', backdropFilter: 'blur(24px) saturate(1.35)' }}
                  data-global-toolbar-bottom-bar
                >
                  {MOBILE_DOCK_ITEMS.map((item) => {
                    const active = ui.mobileDockMode === item.id;
                    const showingAtsPanel = active && item.id === 'settings' && ui.rightPanelTab === 'ats';
                    const Icon = showingAtsPanel ? Target : item.icon;
                    const labelKey = showingAtsPanel ? 'mobileDock.ats' : item.labelKey;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.id === 'settings' && ui.mobileDockMode !== 'settings') {
                            uiDispatch({ type: 'SET_RIGHT_PANEL_TAB', payload: 'settings' });
                          }
                          uiDispatch({ type: 'SET_MOBILE_DOCK_MODE', payload: item.id });
                        }}
                        className={[
                          'flex h-11 w-20 flex-none flex-col items-center justify-center gap-0.5 rounded-[22px] text-[11px] font-medium transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70',
                          active
                            ? 'text-blue-600'
                            : 'text-gray-500 hover:bg-white/30 hover:text-gray-800',
                        ].join(' ')}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon className={active ? 'h-5 w-5 text-blue-600' : 'h-5 w-5 text-gray-500'} />
                        <span>{t(labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>
          </div>
        ) : (
        <div className="editor-page theme-transition-target flex-1 min-h-0 flex flex-col overflow-hidden">
          <header className="global-editor-topbar theme-transition-target no-print">
            <div className="global-editor-topbar__left">
              <Tooltip content={t('back')}>
                <button
                  type="button"
                  onClick={goBack}
                  className="global-editor-topbar__back theme-color-transition"
                  aria-label={t('back')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </Tooltip>

              <div className="flex min-w-0 items-center gap-2">
                <div className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-gray-700 dark:text-[color:var(--text-primary)]">
                  <span className="min-w-0 max-w-[260px] truncate">{ui.resumeMeta.name}</span>
                </div>
                <div className="h-4 w-px flex-shrink-0 bg-gray-200 dark:bg-[color:var(--border-soft)]" />
                <SaveStatusIndicator
                  saveStatus={ui.saveStatus}
                  saveTrigger={ui.saveTrigger}
                  lastSavedAt={ui.lastSavedAt}
                  onManualSave={() => { void triggerSave(); }}
                />
              </div>
            </div>

            <div className="global-editor-topbar__actions">
              {translateButton(false)}
              <ShareDropdown resumeId={resumeId ?? null} />
              <ExportDropdown
                isExportingPDF={isExporting}
                isExportingPNG={isExportingPNG}
                isExportingMD={isExportingMD}
                isExportingJSON={isExportingJSON}
                onExportPDF={onExportPDF}
                onExportPNG={onExportPNG}
                onExportMD={onExportMD}
                onExportJSON={onExportJSON}
              />
            </div>
          </header>

          {/* Three-Column Content */}
          <div className="editor-main theme-transition-target flex-1 min-h-0 flex overflow-hidden relative">
          {/* Left: Editor Panel (collapsible with slide animation) */}
          <div
            className={`left-editor-panel theme-transition-target no-print relative flex-shrink-0 overflow-hidden ease-out transition-[width,min-width,flex-basis] duration-300 ${
              ui.editorOpen ? 'border-r' : 'border-r-0'
            }`}
            style={{
              width: ui.editorOpen ? EDITOR_PANEL_DEFAULT_WIDTH : 0,
              minWidth: ui.editorOpen ? EDITOR_PANEL_DEFAULT_WIDTH : 0,
              flexBasis: ui.editorOpen ? EDITOR_PANEL_DEFAULT_WIDTH : 0,
            }}
          >
            <div className={`h-full transition-opacity duration-200 ${
              ui.editorOpen ? 'opacity-100' : 'opacity-0'
            }`} style={{ width: EDITOR_PANEL_DEFAULT_WIDTH }}>
              <EditorPanel />
            </div>
          </div>

          {/* Toggle button when editor collapsed */}
          {!ui.editorOpen && (
            <div className="absolute left-0 top-1/2 z-10 animate-float-bounce-in" style={{ marginTop: '-32px' }}>
              <button
                onClick={() => uiDispatch({ type: 'SET_EDITOR_OPEN', payload: true })}
                className="theme-color-transition flex items-center justify-center w-6 h-16 bg-white border border-gray-200 border-l-0 rounded-r-lg shadow-sm hover:bg-gray-50 hover:shadow text-gray-400 hover:text-gray-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Center: Preview Canvas */}
          <div className="resume-canvas-wrapper theme-transition-target flex-1 min-w-0 overflow-hidden">
            <PreviewPanel
              previewRef={previewRef}
              resumeId={resumeId}
              isExporting={isExporting}
              isExportingPNG={isExportingPNG}
              isExportingMD={isExportingMD}
              isExportingJSON={isExportingJSON}
              onExportPDF={onExportPDF}
              onExportPNG={onExportPNG}
              onExportMD={onExportMD}
              onExportJSON={onExportJSON}
              onPageCountChange={onPageCountChange}
              canvasToolbar={canvasToolbar}
            />
          </div>

          {/* Right: Settings Panel (collapsible with slide animation) */}
          <div
            className={`right-settings-panel theme-transition-target no-print overflow-hidden transition-[width,min-width] duration-300 ease-out ${
              ui.settingsOpen
                ? 'flex-shrink-0 border-l'
                : 'w-0 min-w-0 border-l-0'
            }`}
            style={{ width: ui.settingsOpen ? RIGHT_PANEL_WIDTH : 0, minWidth: ui.settingsOpen ? RIGHT_PANEL_WIDTH : 0 }}
          >
            <div className={`h-full transition-opacity duration-200 ${
              ui.settingsOpen ? 'opacity-100' : 'opacity-0'
            }`} style={{ width: RIGHT_PANEL_WIDTH }}>
              <RightPanel />
            </div>
          </div>

          {/* Toggle button when settings collapsed */}
          {!ui.settingsOpen && (
            <div className="absolute right-0 top-1/2 z-10 animate-float-bounce-in-right" style={{ marginTop: '-32px' }}>
              <Tooltip content={t('settingsPanel.expand')}>
              <button
                onClick={() => {
                  uiDispatch({ type: 'SET_RIGHT_PANEL_TAB', payload: 'settings' });
                  uiDispatch({ type: 'SET_SETTINGS_OPEN', payload: true });
                }}
                className="theme-color-transition flex items-center justify-center w-6 h-16 bg-white border border-gray-200 border-r-0 rounded-l-lg shadow-sm hover:bg-gray-50 hover:shadow text-gray-400 hover:text-gray-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              </Tooltip>
            </div>
          )}
          </div>
        </div>
        )}
      </div>
    </SaveSync>
  );
}
