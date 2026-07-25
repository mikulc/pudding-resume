import { CUSTOM_COLOR_DEFAULTS, THEME_DEFAULTS, WATERMARK_DEFAULTS, DEFAULT_LAYOUT_ID, DEFAULT_FONT_FAMILY, DEFAULT_TITLE_LAYOUT } from '../../config/defaults';
import i18n from '../../utils/i18n';

export interface WatermarkSettings {
  enabled: boolean;
  content: string;
  isCustomContent?: boolean;  // 用户是否手动修改过水印内容
  opacity: number;      // 0.03 ~ 0.3
  fontSize: number;     // 1 ~ 48 px
  rotation: number;     // -90 ~ 0 度
  color: string;        // hex color
  density: 'low' | 'medium' | 'high';  // 稀疏 | 适中 | 密集
}

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: WATERMARK_DEFAULTS.enabled,
  content: i18n.t('watermark.defaultContent', { ns: 'resume' }),
  isCustomContent: false,
  opacity: WATERMARK_DEFAULTS.opacity,
  fontSize: WATERMARK_DEFAULTS.fontSize,
  rotation: WATERMARK_DEFAULTS.rotation,
  color: WATERMARK_DEFAULTS.color,
  density: WATERMARK_DEFAULTS.density,
};

// 自定义主题颜色
export interface CustomThemeColors {
  bg: string;       // 标题背景色，如 '#DBEAFE'
  border: string;   // 标题强调色，如 '#3B82F6'
  tagBg: string;    // 标签背景色，如 '#EFF6FF'
  tagText: string;  // 标签文字色，如 '#2563EB'
}

export const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  bg: CUSTOM_COLOR_DEFAULTS.bg,
  border: CUSTOM_COLOR_DEFAULTS.border,
  tagBg: CUSTOM_COLOR_DEFAULTS.tag_bg,
  tagText: CUSTOM_COLOR_DEFAULTS.tag_text,
};

/** 混白色（factor 越大越接近白色，0~1） */
function mixWithWhite(hex: string, factor: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - factor) + 255 * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - factor) + 255 * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - factor) + 255 * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** 根据主色自动衍生 bg / tagBg / tagText */
export function deriveCustomColors(primary: string): CustomThemeColors {
  return {
    border: primary,
    bg: mixWithWhite(primary, 0.85),
    tagBg: mixWithWhite(primary, 0.92),
    tagText: primary,
  };
}

export type ColorThemeKey = 'blue' | 'gray' | 'black' | 'custom';

export interface ThemeSettings {
  layoutId: string;
  colorTheme: ColorThemeKey;
  customColors?: CustomThemeColors;
  fontFamily: string; // 字体选项 ID，对应 fonts.ts 中的 FontOption.id
  pageMargin: number; // mm
  lineSpacing: number;
  fontSize: number; // px - 正文字号
  sectionTitleFontSize: number; // px - 模块标题字号
  entryTitleFontSize: number; // px - 条目标题行字号
  watermark: WatermarkSettings;
  titleLayout: 'three-column' | 'stacked' | 'compact';
}

export const DEFAULT_THEME: ThemeSettings = {
  layoutId: DEFAULT_LAYOUT_ID,
  colorTheme: 'custom',
  customColors: DEFAULT_CUSTOM_COLORS,
  fontFamily: DEFAULT_FONT_FAMILY,
  pageMargin: THEME_DEFAULTS.page_margin,
  lineSpacing: THEME_DEFAULTS.line_spacing,
  fontSize: THEME_DEFAULTS.font_size,
  sectionTitleFontSize: THEME_DEFAULTS.section_title_font_size,
  entryTitleFontSize: THEME_DEFAULTS.entry_title_font_size,
  watermark: DEFAULT_WATERMARK,
  titleLayout: DEFAULT_TITLE_LAYOUT,
};
