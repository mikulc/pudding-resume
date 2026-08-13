import { useEffect, useState } from 'react';
import { getTemplateCategories, getTemplateLibraries } from '../../api/templates';
import type { TemplateCategoryEntry, TemplateLibraryEntry } from '../../types/resume';

export const ALL_TEMPLATE_CATEGORY = '__all__';

export function deriveTemplateCategories(categories: TemplateCategoryEntry[]): string[] {
  return [ALL_TEMPLATE_CATEGORY, ...categories.map((category) => category.name)];
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
  categories: TemplateCategoryEntry[];
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: TemplateLibraryCache | null = null;
type TemplateLibraryData = Pick<TemplateLibraryCache, 'entries' | 'categories'>;

let pendingRequest: Promise<TemplateLibraryData> | null = null;

export function invalidateResumeTemplateLibraryCache() {
  cache = null;
}

function readCache(): TemplateLibraryData | null {
  if (!cache || Date.now() - cache.cachedAt > CACHE_TTL_MS) return null;
  return { entries: cache.entries, categories: cache.categories };
}

function loadTemplates(): Promise<TemplateLibraryData> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (!pendingRequest) {
    pendingRequest = Promise.all([getTemplateLibraries(), getTemplateCategories()])
      .then(([entries, categories]) => {
        const data = { entries, categories };
        cache = { ...data, cachedAt: Date.now() };
        return data;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }
  return pendingRequest;
}

export function useResumeTemplateLibrary(enabled: boolean) {
  const cached = readCache();
  const [entries, setEntries] = useState<TemplateLibraryEntry[]>(cached?.entries ?? []);
  const [categories, setCategories] = useState<TemplateCategoryEntry[]>(cached?.categories ?? []);
  const [loading, setLoading] = useState(enabled && !cached);

  useEffect(() => {
    if (!enabled) return;
    const cachedEntries = readCache();
    if (cachedEntries) {
      setEntries(cachedEntries.entries);
      setCategories(cachedEntries.categories);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadTemplates()
      .then((loaded) => {
        if (!cancelled) {
          setEntries(loaded.entries);
          setCategories(loaded.categories);
        }
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

  return { entries, categories, loading };
}
