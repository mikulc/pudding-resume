/**
 * 简历卡片预览缓存工具 — 基于 localStorage
 *
 * 编辑器保存成功后，将 content + theme 写入本地缓存。
 * 列表页渲染卡片时优先读取缓存，实现"编辑后回到列表即见最新内容"的实时预览效果。
 *
 * 缓存结构：
 *   Key:   resume_preview_cache_{id}
 *   Value: { content: ResumeData; theme: ThemeSettings; updatedAt: number }
 *
 * 过期策略：写入后 7 天自动过期，读取时惰性清理。
 */

import type { ResumeData, ThemeSettings } from '../types/resume';

const CACHE_PREFIX = 'resume_preview_cache_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

export interface PreviewCacheEntry {
  content: ResumeData;
  theme: ThemeSettings;
  updatedAt: number;
}

/** 写入预览缓存 */
export function setPreviewCache(
  id: string,
  content: ResumeData,
  theme: ThemeSettings,
): void {
  try {
    const entry: PreviewCacheEntry = { content, theme, updatedAt: Date.now() };
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(entry));
  } catch {
    // localStorage 配额超限时静默失败
    console.warn('[previewCache] Failed to write cache; quota may be full');
  }
}

/** 读取预览缓存。过期返回 null。 */
export function getPreviewCache(id: string): { content: ResumeData; theme: ThemeSettings } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + id);
    if (!raw) return null;

    const entry: PreviewCacheEntry = JSON.parse(raw);

    // 惰性过期清理
    if (Date.now() - entry.updatedAt > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + id);
      return null;
    }

    return { content: entry.content, theme: entry.theme };
  } catch {
    // JSON 解析失败或数据结构异常
    try {
      localStorage.removeItem(CACHE_PREFIX + id);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/** 删除指定 ID 的预览缓存 */
export function removePreviewCache(id: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + id);
  } catch {
    /* ignore */
  }
}

/** 清理所有过期的预览缓存（可在初始化时调用） */
export function cleanExpiredCaches(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keys.push(key);
      }
    }

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const entry: PreviewCacheEntry = JSON.parse(raw);
        if (Date.now() - entry.updatedAt > CACHE_TTL) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

/** 清除所有云端简历的预览缓存（ID 不以 'local-' 开头的） */
export function removeCloudPreviewCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX) && !key.startsWith(CACHE_PREFIX + 'local-')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** 清除所有预览缓存（不分云端/本地） */
export function removeAllPreviewCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
