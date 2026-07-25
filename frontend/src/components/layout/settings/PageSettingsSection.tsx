import { ThemeSettings } from '../../../types/resume';

import { SettingDropdown } from './SettingsControls';
import type { SettingsPanelModel } from './useSettingsPanelModel';

export function PageSettingsSection({ model }: { model: SettingsPanelModel }) {
  const { t, theme, updateTheme, pageMarginRange, lineSpacingRange } = model;
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
            <SettingDropdown
              label={t('document.page.lineSpacing')}
              value={theme.lineSpacing}
              range={lineSpacingRange}
              values={[1.2, 1.3, 1.4, 1.5, 1.6, 2.0]}
              formatValue={(v) => v.toFixed(1)}
              onChange={(v) => updateTheme({ lineSpacing: v } as Partial<ThemeSettings>)}
            />
          </div>
        </div>

    </>
  );
}
