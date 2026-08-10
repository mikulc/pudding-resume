import { RotateCcw } from 'lucide-react';
import i18n from '../../../utils/i18n';

import { SettingDropdown } from './SettingsControls';
import type { SettingsPanelModel } from './useSettingsPanelModel';

export function WatermarkSettingsSection({ model }: { model: SettingsPanelModel }) {
  const { uiDispatch, t, theme, watermarkColors, densityOptions, optionLabel, wmOpacityRange, wmFontSizeRange, wmRotationRange } = model;
  return (
    <>
        {/* Watermark Settings */}
        <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
            <span>{t('document.watermark.title')}</span>
            <button
              onClick={() => uiDispatch({ type: 'SET_WATERMARK', payload: { enabled: !theme.watermark.enabled } })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${theme.watermark.enabled ? 'bg-[var(--theme-accent)]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${theme.watermark.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
              />
            </button>
          </h4>
          {theme.watermark.enabled && (
            <div className="space-y-3">
              {/* 水印内容 */}
              <div>
                <label htmlFor="watermark-content" className="text-xs text-gray-500 mb-1 block">{t('document.watermark.content')}</label>
                <div className="relative">
                  <input
                    id="watermark-content"
                    type="text"
                    value={theme.watermark.content}
                    onChange={(e) => uiDispatch({ type: 'SET_WATERMARK', payload: { content: e.target.value, isCustomContent: true } })}
                    placeholder={t('document.watermark.contentPlaceholder')}
                    maxLength={20}
                    className="w-full px-2.5 py-2.5 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--theme-accent)] focus:ring-0 transition-colors"
                  />
                  {theme.watermark.isCustomContent && (
                    <button
                      type="button"
                      onClick={() => {
                        uiDispatch({
                          type: 'SET_WATERMARK',
                          payload: {
                            content: i18n.t('watermark.defaultContent', { ns: 'resume' }),
                            isCustomContent: false,
                          },
                        });
                      }}
                      title={t('document.watermark.restoreDefault')}
                      aria-label={t('document.watermark.restoreDefault')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:!text-[var(--theme-accent)] hover:!bg-[var(--theme-accent-soft)] transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 透明度 */}
              <SettingDropdown
                label={t('document.watermark.opacity')}
                value={theme.watermark.opacity}
                range={wmOpacityRange}
                values={[0.03, 0.05, 0.08, 0.10, 0.15, 0.20, 0.25, 0.30]}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => uiDispatch({ type: 'SET_WATERMARK', payload: { opacity: v } })}
              />

              {/* 字体大小 */}
              <SettingDropdown
                label={t('document.watermark.fontSize')}
                value={theme.watermark.fontSize}
                range={wmFontSizeRange}
                values={[12, 16, 24, 32, 40, 48]}
                formatValue={(v) => `${v}px`}
                onChange={(v) => uiDispatch({ type: 'SET_WATERMARK', payload: { fontSize: v } })}
              />

              {/* 水印密度 */}
              <div>
                <span className="text-xs text-gray-500 mb-1.5 block">{t('document.watermark.density.title')}</span>
                <div className="flex gap-1.5">
                  {densityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => uiDispatch({ type: 'SET_WATERMARK', payload: { density: opt.value as 'low' | 'medium' | 'high' } })}
                      className={`theme-color-transition flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium ${
                        theme.watermark.density === opt.value
                          ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {optionLabel(opt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 旋转角度 */}
              <SettingDropdown
                label={t('document.watermark.rotation')}
                value={theme.watermark.rotation}
                range={wmRotationRange}
                values={[-90, -75, -60, -45, -30, -15, 0]}
                formatValue={(v) => `${v}°`}
                onChange={(v) => uiDispatch({ type: 'SET_WATERMARK', payload: { rotation: v } })}
              />

              {/* 颜色选择 — now driven by backend data */}
              <div>
                <span className="text-xs text-gray-500 mb-1.5 block">{t('document.watermark.color')}</span>
                <div className="settings-watermark-color-row flex items-center gap-2">
                  {watermarkColors.map((pc) => {
                    const isActive = theme.watermark.color === pc.color;
                    return (
                      <button
                        key={pc.color}
                        type="button"
                        onClick={() => uiDispatch({ type: 'SET_WATERMARK', payload: { color: pc.color } })}
                        aria-pressed={isActive}
                        className={`settings-watermark-swatch flex h-6 w-6 items-center justify-center rounded-full border-2 transition-[border-color,transform,box-shadow] duration-150 hover:scale-110 hover:shadow-md ${
                          isActive ? 'scale-110 border-transparent shadow-md' : 'border-transparent hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: pc.color }}
                      >
                        {isActive && (
                          <svg className="h-3.5 w-3.5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

    </>
  );
}
