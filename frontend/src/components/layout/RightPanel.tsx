import { useEffect, useRef } from 'react';
import { Palette, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppUI } from '../../context/ResumeContext';
import { SettingsPanel } from './SettingsPanel';
import { Tooltip } from '../common/Tooltip';
import { AtsPanel } from '../ats/AtsPanel';

interface RightPanelProps {
  isMobile?: boolean;
}

export function RightPanel({ isMobile = false }: RightPanelProps) {
  const { ui, uiDispatch } = useAppUI();
  const { t } = useTranslation('editor');
  const isAts = ui.rightPanelTab === 'ats';
  const previousTabRef = useRef(ui.rightPanelTab);
  const panelAnimationClass = previousTabRef.current === 'ats' && ui.rightPanelTab === 'settings'
    ? 'right-panel-content-enter-from-left'
    : 'right-panel-content-enter-from-right';

  useEffect(() => {
    previousTabRef.current = ui.rightPanelTab;
  }, [ui.rightPanelTab]);

  const handleHeaderAction = () => {
    if (isAts) {
      uiDispatch({ type: 'SET_RIGHT_PANEL_TAB', payload: 'settings' });
      return;
    }
    uiDispatch({ type: 'SET_SETTINGS_OPEN', payload: false });
  };

  return (
    <div className="theme-transition-target h-full flex flex-col overflow-hidden">
      <style>{`
        @keyframes right-panel-content-enter-from-right {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes right-panel-content-enter-from-left {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .right-panel-content-enter-from-right {
          animation: right-panel-content-enter-from-right 180ms ease-out both;
        }

        .right-panel-content-enter-from-left {
          animation: right-panel-content-enter-from-left 180ms ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .right-panel-content-enter-from-right,
          .right-panel-content-enter-from-left {
            animation: none;
          }
        }
      `}</style>

      {!isMobile && (
        <div
          className="theme-transition-target editor-sub-header justify-between px-4"
          data-editor-sub-header="right"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              {isAts ? (
                <Target className="w-4 h-4" />
              ) : (
                <Palette className="w-4 h-4" />
              )}
            </span>
            <h2 className="text-gray-800 font-semibold text-sm dark:text-[color:var(--text-primary)]">
              {isAts ? t('atsPanel.title') : t('settingsPanel.documentSettings')}
            </h2>
          </div>
          <Tooltip content={isAts ? t('settingsPanel.documentSettings') : t('settingsPanel.collapse')}>
            <button
              onClick={handleHeaderAction}
              aria-label={isAts ? t('settingsPanel.documentSettings') : t('settingsPanel.collapse')}
              className="theme-color-transition flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:text-[color:var(--text-secondary)] dark:hover:text-[color:var(--text-primary)] dark:hover:bg-[color:var(--bg-hover)]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Tooltip>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        <div key={ui.rightPanelTab} className={`h-full min-h-0 overflow-hidden ${panelAnimationClass}`}>
          {isAts ? <AtsPanel /> : <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}
