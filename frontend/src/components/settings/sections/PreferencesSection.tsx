import type { SettingsPreferences } from '../useSettingsPreferences';
import { CheckCircle2, Settings, Clock, ChevronDown, Monitor, Braces, Globe } from 'lucide-react';
import type { SupportedLanguage } from '../../../utils/localSettings';

interface PreferencesSectionProps { settings: SettingsPreferences; }

export function PreferencesSection({ settings }: PreferencesSectionProps) {
  const {
    dropdownRef,
    dropdownBtnRef,
    handleIntervalChange,
    handleThemeModeChange,
    handleLanguageChange,
    handleExportJsonSettingsToggle,
    intervalOptions,
    themeModeOptions,
    autoSaveInterval,
    themeMode,
    language,
    exportJsonWithSettings,
    dropdownOpen,
    setDropdownOpen,
    dropdownDir,
    setDropdownDir,
    t,
  } = settings;

  return (
    <section id="preferences" className="scroll-mt-28">
    <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-8">
      <h3 className="text-lg font-bold text-gray-900 mb-1.5 flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-500" />
        {t('preferences.title')}
      </h3>
      <p className="text-sm text-[#6b7280] mb-6">{t('preferences.desc')}</p>

      <div className="space-y-6">
        {/* Auto-save interval */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('preferences.autoSave')}</p>
              <p className="text-xs text-gray-400">{t('preferences.autoSaveDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div ref={dropdownRef} className="relative flex-shrink-0">
              <button
                ref={dropdownBtnRef}
                type="button"
                onClick={() => {
                  if (!dropdownOpen && dropdownBtnRef.current) {
                    const rect = dropdownBtnRef.current.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    // 预估下拉高度：5 个选项 × 36px + padding ≈ 200px
                    setDropdownDir(spaceBelow >= 210 ? 'down' : spaceAbove >= 210 ? 'up' : 'down');
                  }
                  setDropdownOpen(!dropdownOpen);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white hover:border-blue-300 hover:bg-blue-50/30 focus:outline-none transition-colors min-w-[90px] justify-between dark:hover:border-[#fbbf24]/50 dark:hover:bg-[#fbbf24]/10"
              >
                <span>{intervalOptions.find((o) => o.value === autoSaveInterval)?.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className={`absolute right-0 w-full min-w-[120px] bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 z-20 animate-in fade-in zoom-in-95 duration-150 ${
                  dropdownDir === 'up'
                    ? 'bottom-full mb-1 origin-bottom-right'
                    : 'top-full mt-1 origin-top-right'
                }`}>
                  {[...intervalOptions].reverse().map((opt) => {
                    const isSelected = opt.value === autoSaveInterval;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          handleIntervalChange(opt.value);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'text-blue-700 bg-blue-50 font-medium dark:bg-[#fbbf24]/10 dark:text-[#fbbf24]'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="w-4 flex-shrink-0">
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 dark:text-[#fbbf24]" />
                          )}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Theme mode */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Monitor className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('preferences.themeMode')}</p>
              <p className="text-xs text-gray-400">{t('preferences.themeModeDesc')}</p>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-auto">
            {themeModeOptions.map((option) => {
              const selected = option.value === themeMode;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    void handleThemeModeChange(option.value);
                  }}
                  className={`min-w-[74px] rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-[#fbbf24] dark:text-[#17191d]'
                      : 'text-gray-500 hover:bg-white/70 hover:text-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Language selector */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('preferences.language')}</p>
              <p className="text-xs text-gray-400">{t('preferences.languageDesc')}</p>
            </div>
          </div>
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {[
              { value: 'zh-CN' as SupportedLanguage, label: t('preferences.languageZh') },
              { value: 'en-US' as SupportedLanguage, label: t('preferences.languageEn') },
            ].map((opt) => {
              const selected = opt.value === language;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleLanguageChange(opt.value)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selected
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Export JSON with settings toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Braces className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('preferences.exportJson')}</p>
              <p className="text-xs text-gray-400">{t('preferences.exportJsonDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={exportJsonWithSettings}
            onClick={handleExportJsonSettingsToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#fbbf24]/30 ${
              exportJsonWithSettings ? 'bg-blue-600 dark:bg-[#fbbf24]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                exportJsonWithSettings ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
    </section>
  );
}
