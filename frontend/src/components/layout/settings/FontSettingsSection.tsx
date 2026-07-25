import { AlertCircle,CheckCircle2,ChevronDown,Loader2 } from 'lucide-react';
import { FONT_OPTIONS } from '../../../config/fonts';
import { ThemeSettings } from '../../../types/resume';

import { SettingDropdown } from './SettingsControls';
import type { SettingsPanelModel } from './useSettingsPanelModel';

export function FontSettingsSection({ model }: { model: SettingsPanelModel }) {
  const { t, theme, fontLoadStatus, fontDropdownOpen, setFontDropdownOpen, fontAbove, setFontAbove, fontDropdownRef, fontButtonRef, updateTheme, fontSizeRange, sectionTitleFontSizeRange, entryTitleFontSizeRange } = model;
  return (
    <>
        {/* Font Settings */}
        <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('document.font.title')}</h4>
          <div className="space-y-3">
            {/* 字体选择 */}
            <div>
              <div className="mb-1.5 flex min-h-[18px] items-center justify-between gap-2">
                <span className="text-xs text-gray-500">{t('document.font.family')}</span>
                {fontLoadStatus === 'loading' && (
                  <span className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-none text-blue-600">
                    <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin" />
                    <span className="truncate">{t('document.font.loadingInline')}</span>
                  </span>
                )}
                {fontLoadStatus === 'error' && (
                  <span className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-none text-amber-600">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{t('document.font.loadFailedInline')}</span>
                  </span>
                )}
                {fontLoadStatus !== 'loading' && fontLoadStatus !== 'error' && theme.fontFamily === 'misans' && (
                  <span
                    className="min-w-0 truncate text-[11px] leading-none text-orange-600"
                    title={t('document.font.misansCopyright')}
                  >
                    {t('document.font.misansCopyright')}
                  </span>
                )}
              </div>
              <div ref={fontDropdownRef} className="relative">
                <button
                  ref={fontButtonRef}
                  type="button"
                  onClick={() => {
                    if (!fontDropdownOpen && fontButtonRef.current) {
                      const rect = fontButtonRef.current.getBoundingClientRect();
                      setFontAbove(window.innerHeight - rect.bottom < 200);
                    }
                    setFontDropdownOpen(!fontDropdownOpen);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white
                             hover:border-blue-300 hover:bg-blue-50/30
                             focus:outline-none
                             transition-colors"
                  style={{ fontFamily: FONT_OPTIONS[0].cssValue }}
                >
                  <span className="truncate">
                    {(() => {
                      const currentFont = FONT_OPTIONS.find((f) => f.id === theme.fontFamily);
                      return currentFont ? t(currentFont.nameKey) : t('document.font.systemDefault');
                    })()}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${fontDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {fontDropdownOpen && (
                  <div className={`absolute left-0 right-0 ${fontAbove ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top'} bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 z-20 duration-150`}
                    style={{ animation: 'fade-in 0.15s ease-out, zoom-in-95 0.15s ease-out' }}
                  >
                    {FONT_OPTIONS.map((font) => {
                      const isActive = theme.fontFamily === font.id;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => {
                            updateTheme({ fontFamily: font.id });
                            setFontDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'text-blue-700 bg-blue-50 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          style={{ fontFamily: FONT_OPTIONS[0].cssValue }}
                        >
                          <span className="w-4 flex-shrink-0 flex items-center justify-center">
                            {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                          </span>
                          <span className="text-left">{t(font.nameKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 基础字号下拉框 */}
            <SettingDropdown
              label={t('document.font.baseSize')}
              value={theme.fontSize}
              range={fontSizeRange}
              values={[12, 14, 16, 18, 20, 24]}
              formatValue={(v) => `${v}${fontSizeRange.unit}`}
              onChange={(v) => updateTheme({ fontSize: v } as Partial<ThemeSettings>)}
            />

            {/* 标题字号下拉框 */}
            <SettingDropdown
              label={t('document.font.sectionTitleSize')}
              value={theme.sectionTitleFontSize}
              range={sectionTitleFontSizeRange}
              values={[12, 14, 16, 18, 20, 24]}
              formatValue={(v) => `${v}${sectionTitleFontSizeRange.unit}`}
              onChange={(v) => updateTheme({ sectionTitleFontSize: v } as Partial<ThemeSettings>)}
            />

            {/* 条目标题行下拉框 */}
            <SettingDropdown
              label={t('document.font.entryTitleSize')}
              value={theme.entryTitleFontSize}
              range={entryTitleFontSizeRange}
              values={[14, 16, 18, 20, 22, 24]}
              formatValue={(v) => `${v}${entryTitleFontSizeRange.unit}`}
              onChange={(v) => updateTheme({ entryTitleFontSize: v } as Partial<ThemeSettings>)}
            />
          </div>
        </div>

    </>
  );
}
