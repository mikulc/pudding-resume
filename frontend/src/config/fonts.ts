/**
 * 简历字体选项配置
 *
 * 如需添加自定义字体：
 * 1. 将 .woff2 字体文件放入 public/fonts/ 目录
 * 2. 在 index.css 中添加对应的 @font-face 声明
 * 3. 在本文件中添加新的 FontOption 条目
 */

export interface FontOption {
  /** 唯一标识，存入 ThemeSettings.fontFamily */
  id: string;
  /** i18n key for display name */
  nameKey: string;
  /** CSS font-family 值，直接用于 style.fontFamily */
  cssValue: string;
  /** i18n key for category label */
  categoryKey: 'system' | 'sans' | 'serif' | 'other';
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'system',
    nameKey: 'document.font.options.systemDefault',
    cssValue: "'Noto Sans SC','PingFang SC','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif",
    categoryKey: 'system',
  },
  {
    id: 'misans',
    nameKey: 'document.font.options.misans',
    cssValue: "'MiSans','PingFang SC','Microsoft YaHei',sans-serif",
    categoryKey: 'sans',
  },
  {
    id: 'alibaba-puhuiti',
    nameKey: 'document.font.options.alibabaPuhuiti',
    cssValue: "'Alibaba PuHuiTi 3.0','PingFang SC','Microsoft YaHei',sans-serif",
    categoryKey: 'sans',
  },
  {
    id: 'noto-serif',
    nameKey: 'document.font.options.sourceHanSerif',
    cssValue: "'Source Han Serif SC','PingFang SC','Microsoft YaHei',serif",
    categoryKey: 'serif',
  },
  {
    id: 'noto-serif-sc',
    nameKey: 'document.font.options.notoSerif',
    cssValue: "'Noto Serif SC','PingFang SC','Microsoft YaHei',serif",
    categoryKey: 'serif',
  },
];

/**
 * 根据字体 ID 获取 CSS font-family 值
 * 未找到时返回系统默认字体
 */
export function getFontStack(id: string): string {
  return FONT_OPTIONS.find((f) => f.id === id)?.cssValue ?? FONT_OPTIONS[0].cssValue;
}

/**
 * 根据字体 ID 获取 FontOption 对象
 */
export function getFontOption(id: string): FontOption | undefined {
  return FONT_OPTIONS.find((f) => f.id === id);
}
