
import type { SettingsPanelModel } from './useSettingsPanelModel';

export function ResetSettingsSection({ model }: { model: SettingsPanelModel }) {
  const { t, handleResetStyle } = model;
  return (
    <>
        {/* Reset */}
        <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('document.reset.title')}</h4>
          <button
            onClick={handleResetStyle}
            className="theme-color-transition w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-transparent text-red-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-white/5 hover:border-red-300 dark:hover:border-transparent hover:text-red-600 dark:hover:text-gray-300 text-xs font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('document.reset.button')}
          </button>
        </div>

    </>
  );
}
