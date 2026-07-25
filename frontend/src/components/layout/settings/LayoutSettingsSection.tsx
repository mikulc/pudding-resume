
import type { SettingsPanelModel } from './useSettingsPanelModel';

export function LayoutSettingsSection({ model }: { model: SettingsPanelModel }) {
  const { data, resumeDispatch, t, theme, updateTheme } = model;
  return (
    <>
        {/* Layout */}
        <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('document.layout.title')}</h4>
          <div className="space-y-3">
            {/* 字段标签 */}
            <div>
              <span className="text-xs text-gray-500 font-medium mb-1.5 block">{t('document.layout.fieldLabel')}</span>
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  onClick={() => resumeDispatch({ type: 'SET_PERSONAL_INFO', payload: { displayMode: 'icon' } })}
                  className={`theme-color-transition flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium ${
                    (data.personalInfo?.displayMode ?? 'icon') === 'icon'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  {t('document.layout.iconMode')}
                </button>
                <button
                  onClick={() => resumeDispatch({ type: 'SET_PERSONAL_INFO', payload: { displayMode: 'text' } })}
                  className={`theme-color-transition flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium ${
                    (data.personalInfo?.displayMode ?? 'icon') === 'text'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  {t('document.layout.textMode')}
                </button>
              </div>
            </div>

            {/* 头像布局 */}
            <div>
              <span className="text-xs text-gray-500 font-medium mb-1.5 block">{t('document.layout.photoLayout')}</span>
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  onClick={() => resumeDispatch({ type: 'SET_PERSONAL_INFO', payload: { photoLayout: 'right' } })}
                  className={`theme-color-transition flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium ${
                    (data.personalInfo?.photoLayout ?? 'right') === 'right'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {t('document.layout.photoRight')}
                </button>
                <button
                  onClick={() => resumeDispatch({ type: 'SET_PERSONAL_INFO', payload: { photoLayout: 'left' } })}
                  className={`theme-color-transition flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium ${
                    (data.personalInfo?.photoLayout ?? 'right') === 'left'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('document.layout.photoLeft')}
                </button>
              </div>
            </div>

            {/* 标题布局 */}
            <div>
              <span className="text-xs text-gray-500 font-medium mb-1.5 block">{t('document.layout.titleLayout')}</span>
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                {[
                  { key: 'compact' as const, label: t('document.layout.compact') },
                  { key: 'three-column' as const, label: t('document.layout.threeColumn') },
                  { key: 'stacked' as const, label: t('document.layout.stacked') },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => updateTheme({ titleLayout: key })}
                    className={`theme-color-transition flex-1 flex items-center justify-center px-2 py-1.5 rounded-md text-xs font-medium ${
                      theme.titleLayout === key
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
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
