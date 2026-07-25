import { useEffect,useRef,useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
getParsedDocSettings,
type DensityOption,
type DocSettingsData,
type SliderRange,
} from '../../../api/docSettings';
import {
DENSITY_OPTIONS,
PAGE_RANGES,
PRESET_COLORS,
WATERMARK_COLORS,
WATERMARK_RANGES,
} from '../../../config/defaults';
import {
getFontLoadStatus,
subscribeFontLoadStatus,
type FontLoadStatus,
} from '../../../config/fontRegistry';
import { useAppUI,useResume } from '../../../context/ResumeContext';
import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { getLayoutDefaultColor,getLayoutDefaultPageMargin } from '../../../registry/layouts';
import { deriveCustomColors,ThemeSettings } from '../../../types/resume';
import { useConfirm } from '../../common/ConfirmModal';
import { useToast } from '../../common/Toast';
import { useResumeThemeLibrary } from '../ResumeThemePicker';


export function useSettingsPanelModel() {
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

  return {
    uiDispatch, data, resumeDispatch, t, theme, fontLoadStatus,
    fontDropdownOpen, setFontDropdownOpen, fontAbove, setFontAbove, fontDropdownRef, fontButtonRef,
    themeDrawerOpen, setThemeDrawerOpen, randomizing, themeEntries, updateTheme,
    handlePrimaryColorChange, handleApplyTheme, handleRandomTheme, handleResetStyle,
    presetColors, watermarkColors, densityOptions, optionLabel,
    pageMarginRange, lineSpacingRange, fontSizeRange, sectionTitleFontSizeRange,
    entryTitleFontSizeRange, wmOpacityRange, wmFontSizeRange, wmRotationRange,
  };
}

export type SettingsPanelModel = ReturnType<typeof useSettingsPanelModel>;
