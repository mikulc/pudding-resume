import { ThemeSettings } from '../../../types/resume';

import { SettingDropdown } from './SettingsControls';
import type { SettingsPanelModel } from './useSettingsPanelModel';

export function PageSettingsSection({ model }: { model: SettingsPanelModel }) {
  const { t, theme, updateTheme, pageMarginRange } = model;
  return (
    <>
        {/* Page Settings */}
        <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('document.page.title')}</h4>
          <div className="space-y-3">
            <SettingDropdown
              label={t('document.page.pageMargin')}
              value={theme.pageMargin}
              range={pageMarginRange}
              values={[8, 10, 15, 20]}
              formatValue={(v) => `${v}${pageMarginRange.unit}`}
              onChange={(v) => updateTheme({ pageMargin: v } as Partial<ThemeSettings>)}
            />
            <div>
              <span className="text-xs text-gray-500 font-medium mb-1.5 block">{t('document.layout.entryTitleLayout')}</span>
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                {[
                  { key: 'compact' as const, label: t('document.layout.compact') },
                  { key: 'three-column' as const, label: t('document.layout.threeColumn') },
                  { key: 'stacked' as const, label: t('document.layout.stacked') },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => updateTheme({ entryTitleLayout: key })}
                    className={`theme-color-transition flex-1 flex items-center justify-center px-2 py-1.5 rounded-md text-xs font-medium ${
                      theme.entryTitleLayout === key
                        ? 'bg-white text-gray-800 shadow-sm hover:!text-[var(--theme-accent)]'
                        : 'text-gray-500 hover:text-[var(--theme-accent)] dark:hover:!text-[var(--theme-accent)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

    </>
  );
}
