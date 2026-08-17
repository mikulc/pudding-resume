import { ColorPicker } from '../../common/ColorPicker';

import type { SettingsPanelModel } from './useSettingsPanelModel';

export function ColorSettingsSection({ model }: { model: SettingsPanelModel }) {
  const { t, theme, handlePrimaryColorChange, presetColors } = model;
  return (
    <>
      <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('document.color.title')}</h4>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full ring-2 ring-offset-1 ring-gray-200 shadow-sm transition-colors flex-shrink-0"
              style={{ backgroundColor: theme.themeColor }}
            />
            <span className="text-xs text-gray-700 font-medium">{theme.themeColor}</span>
          </div>
        </div>

        <div className="settings-color-grid grid grid-cols-8 gap-1 mb-2.5">
          {presetColors.map((pc) => {
            const isActive = theme.themeColor === pc.color;
            return (
              <button
                key={pc.color}
                onClick={() => handlePrimaryColorChange(pc.color)}
                className={`settings-color-swatch w-full aspect-square rounded-lg border-2 transition-[border-color,transform,box-shadow] duration-150 hover:scale-110 hover:shadow-md ${
                  isActive ? 'border-transparent scale-110 shadow-md' : 'border-transparent hover:border-gray-300'
                }`}
                style={{ backgroundColor: pc.color }}
              >
                {isActive && (
                  <svg className="w-3.5 h-3.5 text-white mx-auto drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] text-gray-400">{t('document.color.more')}</span>
          <ColorPicker
            value={theme.themeColor}
            onChange={handlePrimaryColorChange}
            size="sm"
          />
        </div>
      </div>
    </>
  );
}
