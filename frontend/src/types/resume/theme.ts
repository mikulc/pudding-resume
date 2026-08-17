import { DEFAULT_THEME_COLOR, THEME_DEFAULTS, WATERMARK_DEFAULTS, DEFAULT_LAYOUT_ID, DEFAULT_FONT_FAMILY, DEFAULT_ENTRY_TITLE_LAYOUT } from '../../config/defaults';
import { normalizeFontFamilyId } from '../../config/fonts';
import i18n from '../../utils/i18n';
import type { PersonalPhotoStyle } from './core';

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

/** 混白色（factor 越大越接近白色，0~1） */
function mixWithWhite(hex: string, factor: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - factor) + 255 * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - factor) + 255 * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - factor) + 255 * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** 预览和导出时根据唯一主色生成所需的标题配色，不写入简历数据。 */
export function deriveThemeColors(primary: string): { bg: string; border: string } {
  return {
    border: primary,
    bg: mixWithWhite(primary, 0.85),
  };
}

const LEGACY_THEME_COLORS: Record<string, string> = {
  blue: '#3B82F6',
  gray: '#6B7280',
  black: '#374151',
};

export type PersonalFieldDisplayMode = 'icon' | 'text' | 'none';

export interface PersonalHeaderSettings {
  fieldDisplayMode: PersonalFieldDisplayMode;
  photoLayout?: 'left' | 'right';
  photoLayoutCustomized: boolean;
  photoStyle?: PersonalPhotoStyle;
  photoStyleCustomized: boolean;
}

export const DEFAULT_PERSONAL_HEADER: PersonalHeaderSettings = {
  fieldDisplayMode: 'icon',
  photoLayoutCustomized: false,
  photoStyleCustomized: false,
};

export interface TypographySettings {
  fontFamily: string;
  bodyFontSize: number;
  sectionTitleFontSize: number;
  entryTitleFontSize: number;
  lineSpacing: number;
}

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontFamily: DEFAULT_FONT_FAMILY,
  bodyFontSize: THEME_DEFAULTS.font_size,
  sectionTitleFontSize: THEME_DEFAULTS.section_title_font_size,
  entryTitleFontSize: THEME_DEFAULTS.entry_title_font_size,
  lineSpacing: THEME_DEFAULTS.line_spacing,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

/** 将新版设置或旧 personalInfo 中的展示字段归一化到个人页眉设置。 */
export function normalizePersonalHeaderSettings(
  value?: unknown,
  legacyPersonalInfo?: unknown,
  base: PersonalHeaderSettings = DEFAULT_PERSONAL_HEADER,
): PersonalHeaderSettings {
  const raw = asRecord(value);
  const legacy = asRecord(legacyPersonalInfo);
  const rawDisplayMode = raw.fieldDisplayMode ?? raw.field_display_mode
    ?? legacy.displayMode ?? legacy.display_mode;
  const fieldDisplayMode = rawDisplayMode === 'text' || rawDisplayMode === 'none' || rawDisplayMode === 'icon'
    ? rawDisplayMode
    : base.fieldDisplayMode;
  const rawPhotoLayout = raw.photoLayout ?? raw.photo_layout
    ?? legacy.photoLayout ?? legacy.photo_layout;
  const photoLayout = rawPhotoLayout === 'left' || rawPhotoLayout === 'right'
    ? rawPhotoLayout
    : base.photoLayout;
  const rawPhotoStyle = raw.photoStyle ?? raw.photo_style
    ?? legacy.photoStyle ?? legacy.photo_style;

  return {
    fieldDisplayMode,
    photoLayout,
    photoLayoutCustomized: typeof (raw.photoLayoutCustomized ?? raw.photo_layout_customized
      ?? legacy.photoLayoutCustomized ?? legacy.photo_layout_customized) === 'boolean'
      ? (raw.photoLayoutCustomized ?? raw.photo_layout_customized
        ?? legacy.photoLayoutCustomized ?? legacy.photo_layout_customized) as boolean
      : base.photoLayoutCustomized,
    photoStyle: rawPhotoStyle && typeof rawPhotoStyle === 'object'
      ? rawPhotoStyle as PersonalPhotoStyle
      : base.photoStyle,
    photoStyleCustomized: typeof (raw.photoStyleCustomized ?? raw.photo_style_customized
      ?? legacy.photoStyleCustomized ?? legacy.photo_style_customized) === 'boolean'
      ? (raw.photoStyleCustomized ?? raw.photo_style_customized
        ?? legacy.photoStyleCustomized ?? legacy.photo_style_customized) as boolean
      : base.photoStyleCustomized,
  };
}

/**
 * 读取当前或旧版主题数据中的主色。旧版 customColors/colorTheme 仅用于兼容导入，
 * 新保存的数据统一使用 themeColor。
 */
export function resolveThemeColor(theme?: unknown): string {
  if (!theme || typeof theme !== 'object') return DEFAULT_THEME_COLOR;
  const raw = theme as Record<string, unknown>;
  const directColor = raw.themeColor ?? raw.theme_color;
  if (typeof directColor === 'string' && /^#[0-9a-f]{6}$/i.test(directColor)) {
    return directColor;
  }

  const legacyColors = raw.customColors ?? raw.custom_colors;
  if (legacyColors && typeof legacyColors === 'object') {
    const border = (legacyColors as Record<string, unknown>).border;
    if (typeof border === 'string' && /^#[0-9a-f]{6}$/i.test(border)) return border;
  }

  const legacyTheme = raw.colorTheme ?? raw.color_theme;
  return typeof legacyTheme === 'string'
    ? (LEGACY_THEME_COLORS[legacyTheme] ?? DEFAULT_THEME_COLOR)
    : DEFAULT_THEME_COLOR;
}

export interface ThemeSettings {
  layoutId: string;
  themeColor: string;
  pageMargin: number; // mm
  typography: TypographySettings;
  watermark: WatermarkSettings;
  entryTitleLayout: 'three-column' | 'stacked' | 'compact';
  personalHeader: PersonalHeaderSettings;
}

export const DEFAULT_THEME: ThemeSettings = {
  layoutId: DEFAULT_LAYOUT_ID,
  themeColor: DEFAULT_THEME_COLOR,
  pageMargin: THEME_DEFAULTS.page_margin,
  typography: DEFAULT_TYPOGRAPHY,
  watermark: DEFAULT_WATERMARK,
  entryTitleLayout: DEFAULT_ENTRY_TITLE_LAYOUT,
  personalHeader: DEFAULT_PERSONAL_HEADER,
};

/**
 * 主题设置的单一兼容 seam：支持当前格式、snake_case 和旧 personalInfo 展示字段。
 * 调用方只接触归一化后的 ThemeSettings。
 */
export function normalizeThemeSettings(
  value?: unknown,
  legacyPersonalInfo?: unknown,
  base: ThemeSettings = DEFAULT_THEME,
): ThemeSettings {
  const raw = asRecord(value);
  const rawAppearance = asRecord(raw.appearance);
  const rawPageLayout = asRecord(raw.pageLayout ?? raw.page_layout);
  const rawWatermark = asRecord(raw.watermark);
  const rawTypography = asRecord(raw.typography);
  const hasAppearanceThemeColor = ['themeColor', 'theme_color'].some((key) => key in rawAppearance);
  const hasLegacyThemeColor = ['themeColor', 'theme_color', 'customColors', 'custom_colors', 'colorTheme', 'color_theme']
    .some((key) => key in raw);

  return {
    layoutId: (rawAppearance.layoutId ?? rawAppearance.layout_id
      ?? raw.layoutId ?? raw.layout_id ?? base.layoutId) as string,
    themeColor: hasAppearanceThemeColor
      ? resolveThemeColor(rawAppearance)
      : hasLegacyThemeColor ? resolveThemeColor(raw) : base.themeColor,
    pageMargin: (rawPageLayout.pageMargin ?? rawPageLayout.page_margin
      ?? raw.pageMargin ?? raw.page_margin ?? base.pageMargin) as number,
    typography: {
      fontFamily: normalizeFontFamilyId(
        rawTypography.fontFamily ?? rawTypography.font_family
        ?? raw.fontFamily ?? raw.font_family ?? base.typography.fontFamily,
      ),
      bodyFontSize: (rawTypography.bodyFontSize ?? rawTypography.body_font_size
        ?? raw.fontSize ?? raw.font_size ?? base.typography.bodyFontSize) as number,
      sectionTitleFontSize: (rawTypography.sectionTitleFontSize ?? rawTypography.section_title_font_size
        ?? raw.sectionTitleFontSize ?? raw.section_title_font_size
        ?? base.typography.sectionTitleFontSize) as number,
      entryTitleFontSize: (rawTypography.entryTitleFontSize ?? rawTypography.entry_title_font_size
        ?? raw.entryTitleFontSize ?? raw.entry_title_font_size
        ?? base.typography.entryTitleFontSize) as number,
      lineSpacing: (rawTypography.lineSpacing ?? rawTypography.line_spacing
        ?? raw.lineSpacing ?? raw.line_spacing ?? base.typography.lineSpacing) as number,
    },
    watermark: {
      ...base.watermark,
      ...rawWatermark,
    },
    entryTitleLayout: (
      rawPageLayout.entryTitleLayout
      ?? rawPageLayout.entry_title_layout
      ?? raw.entryTitleLayout
      ?? raw.entry_title_layout
      ?? raw.titleLayout
      ?? raw.title_layout
      ?? base.entryTitleLayout
    ) as ThemeSettings['entryTitleLayout'],
    personalHeader: normalizePersonalHeaderSettings(
      raw.personalInfoLayout ?? raw.personal_info_layout
        ?? raw.personalHeader ?? raw.personal_header,
      legacyPersonalInfo,
      base.personalHeader,
    ),
  };
}
