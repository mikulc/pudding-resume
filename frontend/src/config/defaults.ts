/**
 * 集中式前端默认值定义 —— 单一数据源，消除多处分发。
 *
 * 后端 seed_doc_settings.go 是权威数据源，此文件仅用作后端不可用时的降级 fallback。
 * 所有需要默认值的消费者统一从此文件导入，确保一致性和低修改成本。
 */

// ======================== 主题色预设 ========================

export const PRESET_COLORS = [
  { color: '#3B82F6', labelKey: 'document.colors.blue' },
  { color: '#1e3a5f', labelKey: 'document.colors.deepBlue' },
  { color: '#000000', labelKey: 'document.colors.black' },
  { color: '#248f83', labelKey: 'document.colors.terracotta' },
  { color: '#2890ca', labelKey: 'document.colors.peacockBlue' },
  { color: '#75b35d', labelKey: 'document.colors.grassGreen' },
  { color: '#5c95c1', labelKey: 'document.colors.slateBlue' },
  { color: '#4079a1', labelKey: 'document.colors.deepCyanBlue' },
  { color: '#f9a22c', labelKey: 'document.colors.warmOrange' },
  { color: '#bf9f6c', labelKey: 'document.colors.khakiGold' },
  { color: '#9861db', labelKey: 'document.colors.violet' },
  { color: '#555968', labelKey: 'document.colors.slateGray' },
  { color: '#c76b8b', labelKey: 'document.colors.rose' },
  { color: '#4a8c7e', labelKey: 'document.colors.celadonGreen' },
  { color: '#8b6b4a', labelKey: 'document.colors.caramelBrown' },
  { color: '#6b7db3', labelKey: 'document.colors.lavenderBlue' },
] as const;

// ======================== 水印颜色 ========================

export const WATERMARK_COLORS = [
  { color: '#9CA3AF', labelKey: 'document.watermark.colors.lightGray' },
  { color: '#6B7280', labelKey: 'document.watermark.colors.mediumGray' },
  { color: '#EF4444', labelKey: 'document.watermark.colors.red' },
  { color: '#3B82F6', labelKey: 'document.watermark.colors.blue' },
  { color: '#10B981', labelKey: 'document.watermark.colors.green' },
] as const;

// ======================== 水印密度 ========================

export const DENSITY_OPTIONS = [
  { value: 'low', labelKey: 'document.watermark.density.low' },
  { value: 'medium', labelKey: 'document.watermark.density.medium' },
  { value: 'high', labelKey: 'document.watermark.density.high' },
] as const;

// ======================== 自定义颜色默认值 ========================

export const CUSTOM_COLOR_DEFAULTS = {
  bg: '#DBEAFE',
  border: '#3B82F6',
  tag_bg: '#EFF6FF',
  tag_text: '#2563EB',
} as const;

// ======================== 主题默认值 ========================

export const THEME_DEFAULTS = {
  page_margin: 15,
  line_spacing: 1.5,
  font_size: 16,
  section_title_font_size: 16,
  entry_title_font_size: 14,
} as const;

// ======================== 页面设置滑块范围 ========================

export const PAGE_RANGES = [
  { key: 'pageMargin', min: 10, max: 30, step: 1, unit: 'mm', default: 15, labelKey: 'document.page.pageMargin' },
  { key: 'lineSpacing', min: 1.0, max: 2.4, step: 0.05, unit: '', default: 1.5, labelKey: 'document.page.lineSpacing' },
  { key: 'fontSize', min: 12, max: 24, step: 2, unit: 'px', default: 16, labelKey: 'document.font.baseSize' },
  { key: 'sectionTitleFontSize', min: 12, max: 24, step: 2, unit: 'px', default: 16, labelKey: 'document.font.sectionTitleSize' },
  { key: 'entryTitleFontSize', min: 14, max: 24, step: 2, unit: 'px', default: 14, labelKey: 'document.font.entryTitleSize' },
] as const;

// ======================== 水印设置滑块范围 ========================

export const WATERMARK_RANGES = [
  { key: 'opacity', min: 0.03, max: 0.3, step: 0.01, unit: '%', default: 0.08, labelKey: 'document.watermark.opacity' },
  { key: 'fontSize', min: 1, max: 48, step: 1, unit: 'px', default: 24, labelKey: 'document.watermark.fontSize' },
  { key: 'rotation', min: -90, max: 0, step: 5, unit: '°', default: -30, labelKey: 'document.watermark.rotation' },
] as const;

// ======================== 水印默认值 ========================

export const WATERMARK_DEFAULTS = {
  enabled: false,
  content: '',
  opacity: 0.08,
  fontSize: 24,
  rotation: -30,
  color: '#6B7280',
  density: 'medium' as const,
} as const;

// ======================== 主题初始默认值 ========================

export const DEFAULT_LAYOUT_ID = 'skyveil';
export const DEFAULT_FONT_FAMILY = 'system';
export const DEFAULT_TITLE_LAYOUT = 'compact' as const;
