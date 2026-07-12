import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../utils/i18n';
import { useAppUI, useResume } from '../../context/ResumeContext';
import { ThemeSettings, DEFAULT_CUSTOM_COLORS, deriveCustomColors } from '../../types/resume';
import { useConfirm } from '../common/ConfirmModal';
import { useToast } from '../common/Toast';
import { Tooltip } from '../common/Tooltip';
import { ColorPicker } from '../common/ColorPicker';
import { FONT_OPTIONS } from '../../config/fonts';
import {
  getFontLoadStatus,
  subscribeFontLoadStatus,
  type FontLoadStatus,
} from '../../config/fontRegistry';
import {
  PRESET_COLORS,
  WATERMARK_COLORS,
  DENSITY_OPTIONS,
  PAGE_RANGES,
  WATERMARK_RANGES,
} from '../../config/defaults';
import { AlertCircle, ChevronDown, CheckCircle2, ChevronRight, Dice5, Loader2, RotateCcw } from 'lucide-react';
import { getLayoutName, getLayoutDefaultColor, getLayoutDefaultPageMargin, resolveLayout } from '../../registry/layouts';
import { ThemeDrawer } from './ThemeDrawer';
import { useResumeThemeLibrary } from './ResumeThemePicker';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import {
  getParsedDocSettings,
  type DocSettingsData,
  type SliderRange,
  type DensityOption,
} from '../../api/docSettings';

function ThemeSignature({ theme }: { theme: ThemeSettings }) {
  const accent = (theme.customColors || DEFAULT_CUSTOM_COLORS).border;
  const signature = resolveLayout(theme.layoutId).signature;
  const isDoubleColumn = signature.layout === 'double-column';

  return (
    <div
      className="relative h-[56px] w-[44px] shrink-0 overflow-hidden rounded-[9px] border border-slate-200/90 bg-white shadow-[0_2px_7px_rgba(15,23,42,0.08)] dark:border-white/[0.10] dark:bg-slate-50"
      aria-hidden="true"
    >
      <svg className="h-full w-full" viewBox="0 0 44 56" fill="none">
        {signature.headerDecoration === 'solid-bar' && (
          <rect width="44" height="12" fill={accent} opacity="0.9" />
        )}
        {signature.headerDecoration === 'side-block' && (
          <rect width={isDoubleColumn ? 14 : 9} height="56" fill={accent} opacity="0.88" />
        )}
        {signature.headerDecoration === 'rings' && (
          <>
            <ellipse cx="5" cy="1" rx="25" ry="14" stroke={accent} strokeWidth="1.3" opacity="0.48" transform="rotate(-14 5 1)" />
            <ellipse cx="24" cy="0" rx="21" ry="11" stroke={accent} strokeWidth="1.2" opacity="0.3" transform="rotate(16 24 0)" />
          </>
        )}
        {signature.headerDecoration === 'wave' && (
          <path d="M0 0H44V8C35 15 17 14 0 8V0Z" fill={accent} opacity="0.9" />
        )}

        {isDoubleColumn && (
          <line x1="15" y1="17" x2="15" y2="50" stroke={accent} strokeWidth="0.8" opacity="0.35" />
        )}

        <g transform={`translate(${isDoubleColumn ? 19 : 6} ${signature.headerDecoration === 'solid-bar' || signature.headerDecoration === 'wave' ? 19 : 15})`}>
          {signature.sectionStyle === 'icon-line' && (
            <>
              <circle cx="2.5" cy="2.5" r="2.5" fill={accent} />
              <path d={`M7 2.5H${isDoubleColumn ? 18 : 30}`} stroke={accent} strokeWidth="1.2" />
              <circle cx="2.5" cy="16.5" r="2.5" fill={accent} />
              <path d={`M7 16.5H${isDoubleColumn ? 18 : 30}`} stroke={accent} strokeWidth="1.2" />
            </>
          )}
          {signature.sectionStyle === 'underline' && (
            <>
              <rect width={isDoubleColumn ? 10 : 14} height="3" rx="1.5" fill="#1E293B" />
              <path d={`M0 6H${isDoubleColumn ? 18 : 32}`} stroke={accent} strokeWidth="1.3" />
              <rect y="15" width={isDoubleColumn ? 9 : 12} height="3" rx="1.5" fill="#1E293B" />
              <path d={`M0 21H${isDoubleColumn ? 18 : 32}`} stroke={accent} strokeWidth="1.3" />
            </>
          )}
          {signature.sectionStyle === 'filled-title' && (
            <>
              <rect width={isDoubleColumn ? 18 : 32} height="6" rx="2" fill={accent} opacity="0.88" />
              <rect y="15" width={isDoubleColumn ? 18 : 32} height="6" rx="2" fill={accent} opacity="0.62" />
            </>
          )}
          {signature.sectionStyle === 'minimal' && (
            <>
              <rect width={isDoubleColumn ? 9 : 13} height="3" rx="1.5" fill="#0F172A" />
              <path d={`M0 6H${isDoubleColumn ? 18 : 32}`} stroke="#0F172A" strokeWidth="1" />
              <rect y="15" width={isDoubleColumn ? 8 : 11} height="3" rx="1.5" fill="#0F172A" />
              <path d={`M0 21H${isDoubleColumn ? 18 : 32}`} stroke="#0F172A" strokeWidth="1" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

// ---- Generic dropdown component replacing sliders ----
function SettingDropdown({
  label,
  value,
  range,
  values,
  formatValue,
  onChange,
}: {
  label: string;
  value: number;
  range: SliderRange;
  values?: number[];
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useOutsideClick({ open, refs: [containerRef], onOutsideClick: () => setOpen(false) });

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const estimatedHeight = 240; // rough max dropdown height in px
      const spaceBelow = window.innerHeight - rect.bottom;
      setAbove(spaceBelow < estimatedHeight);
    }
    setOpen(!open);
  };

  const items: number[] = values ?? Array.from(
    { length: Math.floor((range.max - range.min) / range.step) + 1 },
    (_, i) => range.min + i * range.step,
  );

  const menuPositionClass = above
    ? 'bottom-full mb-1 origin-bottom'
    : 'top-full mt-1 origin-top';

  return (
    <div>
      <span className="text-xs text-gray-500 mb-1.5 block">{label}</span>
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white
                     hover:border-blue-300 hover:bg-blue-50/30
                     focus:outline-none
                     transition-colors"
        >
          <span>{formatValue(value)}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            className={`absolute left-0 right-0 ${menuPositionClass} bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 z-20 duration-150`}
            style={{ animation: 'fade-in 0.15s ease-out, zoom-in-95 0.15s ease-out' }}
          >
            {items.map((v) => {
              const selected = Math.abs(value - v) < 0.001;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                    selected
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="w-4 flex-shrink-0 flex items-center justify-center">
                    {selected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                  </span>
                  {formatValue(v)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const { ui, uiDispatch } = useAppUI();
  const { data, dispatch: resumeDispatch } = useResume();
  const { showToast } = useToast();
  const { t } = useTranslation(['editor', 'common']);
  const { confirm } = useConfirm();
  const { theme } = ui;

  const [docSettings, setDocSettings] = useState<DocSettingsData | null>(null);
  const [fontLoadStatus, setFontLoadStatus] = useState<FontLoadStatus>(() => (
    getFontLoadStatus(theme.fontFamily)
  ));

  // Font dropdown state
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [fontAbove, setFontAbove] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const fontButtonRef = useRef<HTMLButtonElement>(null);

  // Theme drawer state
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);

  // Random theme state
  const [randomizing, setRandomizing] = useState(false);
  const { entries: themeEntries } = useResumeThemeLibrary(true);

  useOutsideClick({
    open: fontDropdownOpen,
    refs: [fontDropdownRef],
    onOutsideClick: () => setFontDropdownOpen(false),
  });

  // Fetch document settings from backend on mount
  useEffect(() => {
    getParsedDocSettings()
      .then(setDocSettings)
      .catch(() => {
        // Backend unavailable — fallback to hardcoded defaults (already handled via fallback constants)
      });
  }, []);

  useEffect(() => {
    const syncFontLoadStatus = () => {
      setFontLoadStatus(getFontLoadStatus(theme.fontFamily));
    };

    syncFontLoadStatus();
    return subscribeFontLoadStatus(syncFontLoadStatus);
  }, [theme.fontFamily]);

  const updateTheme = (partial: Partial<ThemeSettings>) => {
    uiDispatch({ type: 'SET_THEME', payload: partial });
  };

  const handlePrimaryColorChange = (color: string) => {
    updateTheme({ colorTheme: 'custom', customColors: deriveCustomColors(color) });
  };

  const handleApplyTheme = async (layoutId: string, options?: { silent?: boolean }): Promise<void> => {
    // 保存旧主题，用于失败时回滚
    const prevTheme = { ...ui.theme };

    try {
      const defaultColor = getLayoutDefaultColor(layoutId);
      if (!defaultColor) {
        throw new Error(`Invalid layout ID: ${layoutId}`);
      }
      const defaultPageMargin = getLayoutDefaultPageMargin(layoutId);
      updateTheme({
        layoutId,
        colorTheme: 'custom',
        customColors: deriveCustomColors(defaultColor),
        ...(defaultPageMargin !== undefined ? { pageMargin: defaultPageMargin } : {}),
      });
      if (!options?.silent) {
        showToast(t('document.toast.themeApplied'));
      }
    } catch (error) {
      // 应用失败 — 回滚到旧主题
      updateTheme(prevTheme);
      showToast(t('document.toast.themeApplyFailed'));
      throw error; // 重新抛出，让 ThemeDrawer 感知失败
    }
  };

  const handleRandomTheme = async () => {
    // 过滤掉当前主题，且排除没有有效 layoutId 的条目
    const candidates = themeEntries.filter(
      (e) => e.layoutId && e.layoutId !== ui.theme.layoutId,
    );
    if (candidates.length === 0) {
      showToast(t('document.toast.randomThemeNoOther'));
      return;
    }

    setRandomizing(true);
    const randomEntry = candidates[Math.floor(Math.random() * candidates.length)];

    try {
      await handleApplyTheme(randomEntry.layoutId, { silent: true });
      showToast(
        t('document.toast.randomThemeApplied', { name: randomEntry.name }),
      );
    } catch {
      // 错误已在 handleApplyTheme 中处理（回滚 + 错误 toast）
    } finally {
      setRandomizing(false);
    }
  };

  const handleResetStyle = async () => {
    const confirmed = await confirm({
      title: t('document.reset.title'),
      message: t('document.reset.message'),
      confirmText: t('document.reset.confirm'),
      cancelText: t('common:button.cancel'),
    });
    if (confirmed) {
      uiDispatch({ type: 'RESET_STYLE' });
      showToast(t('document.toast.resetDone'));
    }
  };

  // Resolved data with fallbacks (centralized defaults)
  const presetColors = docSettings?.presetColors ?? [...PRESET_COLORS];
  const watermarkColors = docSettings?.watermarkColors ?? [...WATERMARK_COLORS];
  const densityOptions: DensityOption[] = docSettings?.watermarkDensity ?? [...DENSITY_OPTIONS];
  const optionLabel = (option: { value?: string; label?: string; labelKey?: string }) => {
    if (option.labelKey) return t(option.labelKey);
    if (option.value === 'low' || option.value === 'medium' || option.value === 'high') {
      return t(`document.watermark.density.${option.value}`);
    }
    return option.label ?? '';
  };

  // Get slider range config for a specific key
  const getRange = (key: string): SliderRange | undefined =>
    docSettings?.pageRanges?.find(r => r.key === key) ??
    docSettings?.watermarkRanges?.find(r => r.key === key);

  // Resolve slider props from backend ranges or centralized fallback
  const pageMarginRange = getRange('pageMargin') ?? { ...PAGE_RANGES[0] };
  const lineSpacingRange = getRange('lineSpacing') ?? { ...PAGE_RANGES[1] };
  const fontSizeRange = getRange('fontSize') ?? { ...PAGE_RANGES[2] };
  const sectionTitleFontSizeRange = getRange('sectionTitleFontSize') ?? { ...PAGE_RANGES[3] };
  const entryTitleFontSizeRange = getRange('entryTitleFontSize') ?? { ...PAGE_RANGES[4] };
  const wmOpacityRange = getRange('opacity') ?? { ...WATERMARK_RANGES[0] };
  const wmFontSizeRange = getRange('fontSize_watermark') ?? getRange('fontSize') ?? { ...WATERMARK_RANGES[1] };
  const wmRotationRange = getRange('rotation') ?? { ...WATERMARK_RANGES[2] };

  return (
    <div className="theme-transition-target h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 hide-scrollbar mobile-scroll-dock-space">
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

        {/* Color Theme */}
        <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('document.color.title')}</h4>

          {/* 当前选中颜色预览 + 衍生色带 */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full ring-2 ring-offset-1 ring-gray-200 shadow-sm transition-colors flex-shrink-0"
                style={{ backgroundColor: (theme.customColors || DEFAULT_CUSTOM_COLORS).border }}
              />
              <span className="text-xs text-gray-700 font-medium">{(theme.customColors || DEFAULT_CUSTOM_COLORS).border}</span>
            </div>
            <div className="flex-1" />
            {[
              { color: (theme.customColors || DEFAULT_CUSTOM_COLORS).bg, label: t('document.color.titleBackground') },
              { color: (theme.customColors || DEFAULT_CUSTOM_COLORS).tagBg, label: t('document.color.tagBackground') },
              { color: (theme.customColors || DEFAULT_CUSTOM_COLORS).tagText, label: t('document.color.tagText') },
            ].map(({ color, label }) => (
              <Tooltip key={label} content={label}>
              <div
                className="w-6 h-6 rounded-md border border-gray-200 shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
              />
              </Tooltip>
            ))}
          </div>

          {/* 预设色板 — now driven by backend data */}
          <div className="settings-color-grid grid grid-cols-8 gap-1 mb-2.5">
            {presetColors.map((pc) => {
              const isActive = (theme.customColors || DEFAULT_CUSTOM_COLORS).border === pc.color;
              return (
                <button
                  key={pc.color}
                  onClick={() => handlePrimaryColorChange(pc.color)}
                  className={`settings-color-swatch w-full aspect-square rounded-lg border-2 transition-[border-color,transform,box-shadow] duration-150 hover:scale-110 hover:shadow-md ${
                    isActive ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:border-gray-300'
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

          {/* 自定义取色器 */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-gray-400">{t('document.color.more')}</span>
            <ColorPicker
              value={(theme.customColors || DEFAULT_CUSTOM_COLORS).border}
              onChange={handlePrimaryColorChange}
              size="sm"
            />
          </div>
        </div>

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

        {/* Watermark Settings */}
        <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
            <span>{t('document.watermark.title')}</span>
            <button
              onClick={() => uiDispatch({ type: 'SET_WATERMARK', payload: { enabled: !theme.watermark.enabled } })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${theme.watermark.enabled ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'}`}
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
                    className="w-full px-2.5 py-2.5 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
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
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50/60 transition-colors"
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
                          ? 'border-blue-300 bg-blue-50 text-blue-600'
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
                  {watermarkColors.map((pc) => (
                    <button
                      key={pc.color}
                      onClick={() => uiDispatch({ type: 'SET_WATERMARK', payload: { color: pc.color } })}
                      className={`settings-watermark-swatch w-6 h-6 rounded-full border-2 transition-[border-color,transform] duration-150 ${theme.watermark.color === pc.color ? 'border-blue-500 scale-110' : 'border-gray-200 hover:scale-105'}`}
                      style={{ backgroundColor: pc.color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

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
      </div>

      {/* Theme Drawer */}
      <ThemeDrawer
        open={themeDrawerOpen}
        onClose={() => setThemeDrawerOpen(false)}
        currentLayoutId={theme.layoutId}
        onApply={handleApplyTheme}
      />
    </div>
  );
}
