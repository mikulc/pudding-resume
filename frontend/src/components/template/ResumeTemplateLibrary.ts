import { useEffect, useState } from 'react';
import { getTemplateLibraries } from '../../api/templates';
import type { TemplateLibraryEntry } from '../../types/resume';

export const ALL_TEMPLATE_CATEGORY = '__all__';

export const RESUME_TEMPLATE_CATEGORIES = [
  '互联网通用',
  '前端开发',
  '后端开发',
  'Golang',
  'Java',
  'C++',
  '校招',
  '实习',
  '社招',
] as const;

export function deriveTemplateCategories(_entries: TemplateLibraryEntry[]): string[] {
  return [ALL_TEMPLATE_CATEGORY, ...RESUME_TEMPLATE_CATEGORIES];
}

export function filterResumeTemplates(
  entries: TemplateLibraryEntry[],
  activeCategory: string,
): TemplateLibraryEntry[] {
  if (activeCategory === ALL_TEMPLATE_CATEGORY) return entries;
  return entries.filter((entry) => entry.categories.includes(activeCategory));
}

interface TemplateLibraryCache {
  entries: TemplateLibraryEntry[];
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: TemplateLibraryCache | null = null;
let pendingRequest: Promise<TemplateLibraryEntry[]> | null = null;

export function invalidateResumeTemplateLibraryCache() {
  cache = null;
}

function readCache(): TemplateLibraryEntry[] | null {
  if (!cache || Date.now() - cache.cachedAt > CACHE_TTL_MS) return null;
  return cache.entries;
}

function loadTemplates(): Promise<TemplateLibraryEntry[]> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (!pendingRequest) {
    pendingRequest = getTemplateLibraries()
      .then((entries) => {
        cache = { entries, cachedAt: Date.now() };
        return entries;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }
  return pendingRequest;
}

export function useResumeTemplateLibrary(enabled: boolean) {
  const cached = readCache();
  const [entries, setEntries] = useState<TemplateLibraryEntry[]>(cached ?? []);
  const [loading, setLoading] = useState(enabled && !cached);

  useEffect(() => {
    if (!enabled) return;
    const cachedEntries = readCache();
    if (cachedEntries) {
      setEntries(cachedEntries);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadTemplates()
      .then((loaded) => {
        if (!cancelled) setEntries(loaded);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    window.addEventListener('pudding:template-library-changed', invalidateResumeTemplateLibraryCache);
    return () => window.removeEventListener('pudding:template-library-changed', invalidateResumeTemplateLibraryCache);
  }, []);

  return { entries, loading };
}
