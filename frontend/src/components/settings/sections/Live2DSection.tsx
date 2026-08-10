import type { SettingsPreferences } from '../useSettingsPreferences';
import { RotateCcw, Settings, ChevronDown, SmilePlus, Move, Check, Smartphone, Monitor, Pin } from 'lucide-react';
import { LIVE2D_POSITION_OPTIONS, formatLive2dNearbyBehavior } from '../settingsConstants';

interface Live2DSectionProps { settings: SettingsPreferences; }

export function Live2DSection({ settings }: Live2DSectionProps) {
  const {
    saveLive2dPreferences,
    handleLive2dToggle,
    handleLive2dPositionChange,
    handleLive2dReset,
    live2dPosition,
    live2dShowEditor,
    setLive2dShowEditor,
    live2dEnabled,
    live2dMobileShow,
    setLive2dMobileShow,
    live2dPointerPassThrough,
    setLive2dPointerPassThrough,
    live2dNearbyBehavior,
    setLive2dNearbyBehavior,
    live2dPinned,
    setLive2dPinned,
    live2dMoreSettingsOpen,
    setLive2dMoreSettingsOpen,
    t,
  } = settings;

  return (
    <section id="live2d" className="scroll-mt-28">
    <div className={`mb-6 bg-white rounded-2xl border border-gray-100 ${live2dEnabled ? 'p-8' : 'py-5 px-8'}`}>
      <h3 className={`text-lg font-bold text-gray-900 flex items-center gap-2 ${live2dEnabled ? 'mb-1.5' : ''}`}>
        <SmilePlus className="w-5 h-5 text-gray-500" />
        {t('nav.live2d')}
        <button
          type="button"
          role="switch"
          aria-checked={live2dEnabled}
          onClick={handleLive2dToggle}
          className={`ml-auto relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            live2dEnabled ? 'bg-[var(--theme-accent)]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              live2dEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </h3>
      <p className="text-sm text-[#6b7280] mb-4">{t('live2d.desc')}</p>

      <div className="space-y-6">
        <div>
          {live2dEnabled && <div className="border-t border-gray-100 mb-4" />}

          {/* Mobile show toggle */}
          {live2dEnabled && (
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              {t('live2d.mobileShow')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={live2dMobileShow}
              onClick={() => {
                const next = !live2dMobileShow;
                setLive2dMobileShow(next);
                saveLive2dPreferences({ live2d_mobile_show: next });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                live2dMobileShow ? 'bg-[var(--theme-accent)]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  live2dMobileShow ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          )}

          {/* Editor page toggle */}
          {live2dEnabled && (
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" />
              {t('live2d.showEditor')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={live2dShowEditor}
              onClick={() => {
                const next = !live2dShowEditor;
                setLive2dShowEditor(next);
                saveLive2dPreferences({ live2d_show_editor: next });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                live2dShowEditor ? 'bg-[var(--theme-accent)]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  live2dShowEditor ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          )}

          {live2dEnabled && (
            <div className="space-y-4">
              {/* Position selector */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5" />
                  {t('live2d.position.label')}
                </span>
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 flex-shrink-0">
                  {LIVE2D_POSITION_OPTIONS.map((opt) => {
                    const isSelected = opt.value === live2dPosition;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleLive2dPositionChange(opt.value)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {t(`live2d.position.${opt.value}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* More Settings toggle */}
              <button
                type="button"
                onClick={() => setLive2dMoreSettingsOpen(!live2dMoreSettingsOpen)}
                className="flex items-center justify-between gap-4 w-full"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Settings className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-700">{t('live2d.advanced.title')}</p>
                    {!live2dMoreSettingsOpen && (
                      <p className="text-xs text-gray-400">{t('live2d.advanced.desc')}</p>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                    live2dMoreSettingsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Collapsible advanced settings */}
              {live2dMoreSettingsOpen && (
                <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                  {/* Pointer events pass-through */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {t('live2d.pointerPassThrough')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={live2dPointerPassThrough}
                      onClick={() => {
                        const next = !live2dPointerPassThrough;
                        setLive2dPointerPassThrough(next);
                        saveLive2dPreferences({ live2d_enable_pointer_events_pass_through: next });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        live2dPointerPassThrough ? 'bg-[var(--theme-accent)]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          live2dPointerPassThrough ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Nearby behavior */}
                  <div className={`flex items-center justify-between gap-4 ${live2dPinned ? 'opacity-40 pointer-events-none' : ''}`}>
                    <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5" />
                      {t('live2d.nearbyBehavior.label')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-20 text-right">
                        {formatLive2dNearbyBehavior(live2dNearbyBehavior, t)}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={live2dNearbyBehavior === 'expand'}
                        onClick={() => {
                          if (live2dPinned) return;
                          const next = live2dNearbyBehavior === 'expand' ? 'retract' : 'expand';
                          setLive2dNearbyBehavior(next);
                          saveLive2dPreferences({ live2d_nearby_behavior: next });
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          live2dNearbyBehavior === 'expand' ? 'bg-[var(--theme-accent)]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            live2dNearbyBehavior === 'expand' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 甯搁┗妯″紡 */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5" />
                      {t('live2d.pinned')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={live2dPinned}
                      onClick={() => {
                        const next = !live2dPinned;
                        setLive2dPinned(next);
                        saveLive2dPreferences({ live2d_pinned: next });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        live2dPinned ? 'bg-[var(--theme-accent)]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          live2dPinned ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reset button at bottom-right */}
      {live2dEnabled && (
        <>
          <div className="border-t border-gray-100 mt-4" />
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={handleLive2dReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-normal text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-600 hover:border-rose-300 transition-colors focus:outline-none"
            >
              <RotateCcw className="w-3 h-3" />
              {t('live2d.reset')}
            </button>
          </div>
        </>
      )}
    </div>
    </section>
  );
}
