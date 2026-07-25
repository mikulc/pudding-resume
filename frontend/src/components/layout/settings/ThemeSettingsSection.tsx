import { ChevronRight,Dice5 } from 'lucide-react';
import { getLayoutName } from '../../../registry/layouts';
import { Tooltip } from '../../common/Tooltip';

import { ThemeSignature } from './SettingsControls';
import type { SettingsPanelModel } from './useSettingsPanelModel';

export function ThemeSettingsSection({ model }: { model: SettingsPanelModel }) {
  const { t, theme, setThemeDrawerOpen, randomizing, themeEntries, handleRandomTheme } = model;
  return (
    <>
        {/* Resume Theme */}
        <div className="settings-card rounded-[20px] border border-slate-200/70 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.035)] dark:border-white/[0.07] dark:bg-slate-800/90 dark:shadow-none">
          <h4 className="mb-3 text-[15px] font-semibold leading-5 text-slate-800 dark:text-white/90">{t('document.resumeTheme.title')}</h4>

          {/* Current theme preview */}
          <button
            type="button"
            onClick={() => setThemeDrawerOpen(true)}
            aria-label={t('document.resumeTheme.switch')}
            className="group flex w-full items-center gap-3 rounded-[14px] border border-slate-200/70 bg-slate-50/90 p-3 text-left transition-colors hover:border-slate-200 hover:bg-slate-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-white/[0.07] dark:bg-white/[0.035] dark:hover:border-white/[0.10] dark:hover:bg-white/[0.055]"
          >
            <ThemeSignature theme={theme} />
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-4 text-slate-400 dark:text-white/55">{t('document.resumeTheme.current')}</p>
              <p className="mt-0.5 truncate text-[15px] font-semibold leading-5 text-slate-800 dark:text-white/90">{getLayoutName(theme.layoutId)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-500/[0.09] px-2 py-[3px] text-[11px] font-medium leading-4 text-blue-600 dark:bg-blue-400/[0.14] dark:text-blue-300">
              {t('document.resumeTheme.active')}
            </span>
          </button>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setThemeDrawerOpen(true)}
              className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-blue-500/[0.08] px-3 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-500/[0.13] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:bg-blue-400/[0.12] dark:text-blue-300 dark:hover:bg-blue-400/[0.18]"
            >
              {t('document.resumeTheme.switch')}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <Tooltip content={t('document.resumeTheme.random')} enabled>
              <button
                type="button"
                onClick={handleRandomTheme}
                disabled={randomizing || themeEntries.length === 0}
                aria-label={t('document.resumeTheme.random')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-slate-100 text-slate-500 transition-colors hover:bg-blue-500/[0.09] hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.06] dark:text-white/60 dark:hover:bg-blue-400/[0.14] dark:hover:text-blue-300"
              >
                <Dice5 className={`h-[17px] w-[17px] ${randomizing ? 'animate-spin' : ''}`} />
              </button>
            </Tooltip>
          </div>
        </div>

    </>
  );
}
