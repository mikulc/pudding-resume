/**
 * 字体文件注册表 — 中心化管理所有自定义字体的文件路径和字重
 *
 * 作用：
 * 1. 导出时根据 fontFamily ID 查找对应的字体文件
 * 2. 生成 @font-face CSS，字体文件由后端本地提供（后端将字体复制到临时 HTTP 目录）
 * 3. 避免编辑页/分享页/导出页三处分别维护 @font-face 声明
 */

import { FONT_OPTIONS, type FontOption } from './fonts';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const BACKEND_FONT_URL = `${API_BASE}/api/font-files`.replace(/\/+$/, '');
const CDN_BASE_URL = (import.meta.env.VITE_FONT_BASE_URL || '').replace(/\/+$/, '');

export type FontLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

const fontLoadStatusById = new Map<string, FontLoadStatus>();
const fontLoadPromiseById = new Map<string, Promise<void>>();
const loadedFamilies = new Set<string>();
const fontLoadListeners = new Set<() => void>();

function setFontLoadStatus(fontId: string, status: FontLoadStatus): void {
  if (fontLoadStatusById.get(fontId) === status) return;
  fontLoadStatusById.set(fontId, status);
  fontLoadListeners.forEach((listener) => listener());
}

export function getFontLoadStatus(fontId: string): FontLoadStatus {
  const family = getPrimaryFamilyById(fontId);
  if (!family || !hasCustomFontFiles(family)) return 'loaded';
  if (loadedFamilies.has(family)) return 'loaded';
  return fontLoadStatusById.get(fontId) ?? 'idle';
}

export function subscribeFontLoadStatus(listener: () => void): () => void {
  fontLoadListeners.add(listener);
  return () => {
    fontLoadListeners.delete(listener);
  };
}

// ===== 探针机制：快速检测后端字体服务是否可达 =====

let _backendAvailable: boolean | null = null;     // 内存缓存
let _probePromise: Promise<boolean> | null = null; // 并发去重

const PROBE_STORAGE_KEY = 'pd-font-backend-ok';

function loadProbeCache(): boolean | null {
  try {
    const v = sessionStorage.getItem(PROBE_STORAGE_KEY);
    return v === 'true' ? true : v === 'false' ? false : null;
  } catch { /* sessionStorage 不可用时忽略 */ }
  return null;
}

function saveProbeCache(ok: boolean): void {
  try { sessionStorage.setItem(PROBE_STORAGE_KEY, String(ok)); } catch { /* 忽略 */ }
}

/**
 * 获取默认探针文件：注册表中任意一个字体的第一个文件。
 */
function getDefaultProbeFile(): string {
  const firstFamily = Object.values(FONT_REGISTRY)[0];
  return firstFamily?.[0]?.file ?? 'MiSans-Regular.woff2';
}

/**
 * 用 HEAD 请求快速探测后端字体服务是否可达。
 * 超时 1.5s，结果缓存在内存 + sessionStorage。
 * 多次并发调用会复用同一个探针 Promise。
 *
 * @param file - 可选，指定要探测的字体文件名；不传则使用注册表中第一个字体文件。
 */
async function probeBackendFonts(file?: string): Promise<boolean> {
  const probeFile = file ?? getDefaultProbeFile();

  // 1. 内存缓存
  if (_backendAvailable !== null) return _backendAvailable;

  // 2. sessionStorage 缓存（页面刷新后复用）
  const cached = loadProbeCache();
  if (cached !== null) {
    _backendAvailable = cached;
    return cached;
  }

  // 3. 复用正在进行的探测
  if (_probePromise) return _probePromise;

  _probePromise = (async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    try {
      const r = await fetch(`${BACKEND_FONT_URL}/${probeFile}`, {
        method: 'HEAD',
        signal: ctrl.signal,
        cache: 'no-cache',
      });
      _backendAvailable = r.ok;
    } catch {
      _backendAvailable = false;
    } finally {
      clearTimeout(t);
      _probePromise = null;
    }
    saveProbeCache(_backendAvailable);
    return _backendAvailable;
  })();

  return _probePromise;
}

/**
 * 生成 CSS src 声明。
 * 根据探针结果只输出一个 URL，避免 CSS fallback 串行等待。
 */
function fontFileSrcValue(file: string, format: string, backendAvailable: boolean): string {
  if (backendAvailable) {
    return `url('${BACKEND_FONT_URL}/${file}') format('${format}')`;
  }
  if (CDN_BASE_URL) {
    return `url('${CDN_BASE_URL}/${file}') format('${format}')`;
  }
  // 后端不可用、CDN 也未配置，仍尝试后端 URL（让浏览器报错，便于排查）
  return `url('${BACKEND_FONT_URL}/${file}') format('${format}')`;
}

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

/**
 * 从 font-family cssValue 字符串中提取第一个字体族名
 * 例如 "'MiSans','PingFang SC',sans-serif" → "MiSans"
 */
export function extractPrimaryFamily(cssValue: string): string {
  const firstEntry = cssValue.split(',')[0].trim();
  return firstEntry.replace(/['"]/g, '');
}

/**
 * 根据字体选项 ID 查找对应的字体族名
 */
export function getPrimaryFamilyById(fontId: string): string | null {
  const option: FontOption | undefined = FONT_OPTIONS.find((f) => f.id === fontId);
  if (!option) return null;
  return extractPrimaryFamily(option.cssValue);
}

/**
 * 检查字体族名是否在注册表中有对应的自定义字体文件
 */
export function hasCustomFontFiles(family: string): boolean {
  return family in FONT_REGISTRY;
}

/**
 * 为指定字体族生成 @font-face CSS 声明（使用相对文件路径，后端本地提供字体文件）
 *
 * 字体文件由后端在创建临时 HTTP 目录时复制到同目录下，
 * 因此只需使用 ./文件名.woff2 的相对引用即可。
 */
function generateFontFaceCSSForFamily(family: string): string {
  const entries = FONT_REGISTRY[family];
  if (!entries) return '';

  const declarations = entries.map((entry) => {
    const format = entry.format ?? 'woff2';
    return `@font-face {
  font-family: '${family}';
  src: url('./${entry.file}') format('${format}');
  font-weight: ${entry.weight};
  font-style: ${entry.style};
  font-display: block;
}`;
  });

  return declarations.join('\n');
}

/**
 * 根据字体 ID 生成导出用的 @font-face CSS
 *
 * @param fontId - 字体选项 ID（如 'misans', 'system'）
 * @returns @font-face CSS 字符串，如果字体为系统字体或未找到则返回空
 */
export function generateExportFontCSS(fontId: string): string {
  const primaryFamily = getPrimaryFamilyById(fontId);
  if (!primaryFamily || !hasCustomFontFiles(primaryFamily)) {
    return '';
  }

  return generateFontFaceCSSForFamily(primaryFamily);
}

/**
 * 在应用启动时预加载所有注册的自定义字体文件
 * 使用 FontFace API 主动加载到浏览器字体缓存中，
 * 确保用户切换字体时文件已就绪，消除 FOUT/FOIT
 *
 * 先探测后端可用性，再注入单源 URL 的 @font-face 声明。
 */
export async function registerAllFontFaces(): Promise<void> {
  if (typeof document === 'undefined') return;

  const backendAvailable = await probeBackendFonts();
  for (const [family, entries] of Object.entries(FONT_REGISTRY)) {
    registerFontFaceCSS(family, entries, backendAvailable);
  }
}

/**
 * 按需预加载指定字体 ID 对应的字体族文件（Regular + Bold 两个字重）。
 *
 * 与 {@link registerAllFontFaces} 不同，本函数只注册当前简历选中的字体，
 * 避免在首页等不需要自定义字体的页面声明全部字体。
 * 所有字体（包括"系统默认"）都会通过后端加载对应的 woff2 文件，
 * 确保编辑器和导出 PDF 使用完全相同的字体，所见即所得。
 *
 * 先探测后端可用性，再注入单源 URL 的 @font-face 声明。
 *
 * @param fontId - 字体选项 ID（如 'misans'、'system'），对应 fonts.ts 中的 FontOption.id
 * 所有字体（包括"系统默认"）都会加载对应的 woff2 文件，确保编辑器和导出效果一致。
 */
export async function registerFontFamily(fontId: string): Promise<void> {
  if (typeof document === 'undefined') return;

  const family = getPrimaryFamilyById(fontId);
  if (!family || !hasCustomFontFiles(family)) {
    setFontLoadStatus(fontId, 'loaded');
    return;
  }

  if (loadedFamilies.has(family)) {
    setFontLoadStatus(fontId, 'loaded');
    return;
  }

  const pending = fontLoadPromiseById.get(fontId);
  if (pending) return pending;

  const entries = FONT_REGISTRY[family];
  setFontLoadStatus(fontId, 'loading');

  const promise = (async () => {
    try {
      const probeFile = entries[0]?.file;
      const backendAvailable = await probeBackendFonts(probeFile);
      registerFontFaceCSS(family, entries, backendAvailable);
      await loadRegisteredFontFaces(family, entries);
      loadedFamilies.add(family);
      setFontLoadStatus(fontId, 'loaded');
    } catch (error) {
      console.warn(`[fontRegistry] Failed to load font family ${family}`, error);
      setFontLoadStatus(fontId, 'error');
    } finally {
      fontLoadPromiseById.delete(fontId);
    }
  })();

  fontLoadPromiseById.set(fontId, promise);
  return promise;
}

/**
 * 注册完整字体文件的 @font-face CSS 声明。
 */
function registerFontFaceCSS(family: string, entries: FontFileEntry[], backendAvailable: boolean): void {
  const declarations = entries.map((entry) => {
    const format = entry.format ?? 'woff2';
    return `@font-face {
  font-family: '${family}';
  src: ${fontFileSrcValue(entry.file, format, backendAvailable)};
  font-weight: ${entry.weight};
  font-style: ${entry.style};
  font-display: swap;
}`;
  }).join('\n');

  setFontFaceStyle(family, declarations);
}

async function loadRegisteredFontFaces(family: string, entries: FontFileEntry[]): Promise<void> {
  if (!document.fonts) return;

  const escapedFamily = family.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  await Promise.all(
    entries.map((entry) => document.fonts.load(`${entry.weight} 16px "${escapedFamily}"`)),
  );
}

function setFontFaceStyle(family: string, declarations: string): void {
  const styleId = `resume-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (style?.textContent === declarations) return;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.dataset.resumeFontFamily = family;
    document.head.appendChild(style);
  }
  style.id = styleId;
  style.dataset.resumeFontFamily = family;
  style.textContent = declarations;
}

/**
 * 等待当前页面所有字体加载完成
 * 在导出前调用，确保字体已就绪
 */
export async function waitForFontsReady(): Promise<void> {
  if (!document.fonts) return;

  const deadline = Date.now() + 10000; // 10s 超时

  try {
    // document.fonts.ready 是一个 Promise，在所有字体加载完成后 resolve
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => {
        const check = () => {
          if (Date.now() > deadline) {
            console.warn('[fontRegistry] Font loading timed out; continuing export');
            resolve();
            return;
          }
          // status: 'loading' | 'loaded'
          if (document.fonts.status === 'loaded') {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      }),
    ]);
  } catch {
    console.warn('[fontRegistry] document.fonts.ready failed; continuing export');
  }
}
