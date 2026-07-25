export interface FontFileEntry {
  /** 字重（400=Regular, 700=Bold） */
  weight: number;
  /** 字体样式 */
  style: 'normal' | 'italic';
  /** 相对于 /fonts/ 目录的文件名 */
  file: string;
  /** CSS format() 描述符，如 'woff2'、'opentype'。默认 'woff2' */
  format?: string;
}

/**
 * 字体注册表：font-family 名称 → 字体文件列表
 * 添加新字体时在这里注册，导出时自动嵌入对应字体文件。
 */
export const FONT_REGISTRY: Record<string, FontFileEntry[]> = {
  MiSans: [
    { weight: 400, style: 'normal', file: 'MiSans-Regular.woff2' },
    { weight: 700, style: 'normal', file: 'MiSans-Bold.woff2' },
  ],
  'Source Han Serif SC': [
    { weight: 400, style: 'normal', file: 'SourceHanSerifSC-Regular.woff2' },
    { weight: 700, style: 'normal', file: 'SourceHanSerifSC-Bold.woff2' },
  ],
  'Alibaba PuHuiTi 3.0': [
    { weight: 400, style: 'normal', file: 'AlibabaPuHuiTi-3-55-Regular.woff2' },
    { weight: 700, style: 'normal', file: 'AlibabaPuHuiTi-3-85-Bold.woff2' },
  ],
  'Noto Serif SC': [
    { weight: 400, style: 'normal', file: 'NotoSerifSC-Regular.woff2' },
    { weight: 700, style: 'normal', file: 'NotoSerifSC-Bold.woff2' },
  ],
  'Noto Sans SC': [
    { weight: 400, style: 'normal', file: 'NotoSansSC-Regular.woff2' },
    { weight: 700, style: 'normal', file: 'NotoSansSC-Bold.woff2' },
  ],
};

