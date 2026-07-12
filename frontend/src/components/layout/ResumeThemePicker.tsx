import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { getDemoContent, getStyleLibraries } from '../../api/templates';
import { ResumeCardPreview } from '../preview/ResumeCardPreview';
import type { ResumeData, StyleLibraryEntry, ThemeSettings } from '../../types/resume';
import { createInitialThemeSettings } from '../../utils/resumeDraft';
import { resolveLayout } from '../../registry/layouts';

export const ALL_THEME_CATEGORY = '__all__';

/** Extract categories from entries while keeping the all-category sentinel first. */
export function deriveCategories(entries: StyleLibraryEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    if (e.category) set.add(e.category);
  }
  return [ALL_THEME_CATEGORY, ...Array.from(set)];
}

export function buildResumePreviewTheme(entry: StyleLibraryEntry): ThemeSettings {
  const theme = createInitialThemeSettings(entry.layoutId, entry.previewColors?.accentBar);

  return {
    ...theme,
    watermark: {
      ...theme.watermark,
      enabled: false,
    },
  };
}

export function filterResumeThemeEntries(
  entries: StyleLibraryEntry[],
  activeCategory: string,
): StyleLibraryEntry[] {
  if (activeCategory === ALL_THEME_CATEGORY) return entries;
  return entries.filter((entry) => entry.category === activeCategory);
}

interface ResumeThemeLibraryData {
  entries: StyleLibraryEntry[];
  demoContent: ResumeData | null;
}

interface ResumeThemeLibraryCache extends ResumeThemeLibraryData {
  cachedAt: number;
}

const RESUME_THEME_LIBRARY_CACHE_TTL_MS = 5 * 60 * 1000;

let resumeThemeLibraryCache: ResumeThemeLibraryCache | null = null;
let resumeThemeLibraryRequest: Promise<ResumeThemeLibraryData> | null = null;

function readResumeThemeLibraryCache(): ResumeThemeLibraryData | null {
  if (!resumeThemeLibraryCache) return null;

  if (Date.now() - resumeThemeLibraryCache.cachedAt > RESUME_THEME_LIBRARY_CACHE_TTL_MS) {
    return null;
  }

  return {
    entries: resumeThemeLibraryCache.entries,
    demoContent: resumeThemeLibraryCache.demoContent,
  };
}

function loadResumeThemeLibrary(): Promise<ResumeThemeLibraryData> {
  const cached = readResumeThemeLibraryCache();
  if (cached) return Promise.resolve(cached);

  if (!resumeThemeLibraryRequest) {
    resumeThemeLibraryRequest = Promise.allSettled([getStyleLibraries(), getDemoContent()])
      .then(([styleResult, demoResult]) => {
        const library = {
          entries: styleResult.status === 'fulfilled' ? styleResult.value : [],
          demoContent: demoResult.status === 'fulfilled' ? demoResult.value : null,
        };

        if (styleResult.status === 'fulfilled') {
          resumeThemeLibraryCache = {
            ...library,
            cachedAt: Date.now(),
          };
        }

        return library;
      })
      .finally(() => {
        resumeThemeLibraryRequest = null;
      });
  }

  return resumeThemeLibraryRequest;
}

export function useResumeThemeLibrary(enabled: boolean) {
  const cached = readResumeThemeLibraryCache();
  const [entries, setEntries] = useState<StyleLibraryEntry[]>(() => cached?.entries ?? []);
  const [demoContent, setDemoContent] = useState<ResumeData | null>(() => cached?.demoContent ?? null);
  const [loading, setLoading] = useState(() => enabled && !cached);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const cachedLibrary = readResumeThemeLibraryCache();
    if (cachedLibrary) {
      setEntries(cachedLibrary.entries);
      setDemoContent(cachedLibrary.demoContent);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadResumeThemeLibrary()
      .then((library) => {
        if (cancelled) return;
        setEntries(library.entries);
        setDemoContent(library.demoContent);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { entries, demoContent, loading };
}

interface ResumeThemeCardsProps {
  entries: StyleLibraryEntry[];
  demoContent: ResumeData | null;
  loading: boolean;
  selectedLayoutId: string | null;
  onSelect: (layoutId: string) => void;
  currentLayoutId?: string;
  showCurrentBadge?: boolean;
  gridClassName?: string;
  loadingClassName?: string;
  loadingText?: string;
  emptyText?: string;
  compact?: boolean;
  /** Override the base card className (unselected state). Default matches the resume grid card surface. */
  cardClassName?: string;
  /** Layout ID that is currently being applied – shows loading state */
  applyingLayoutId?: string | null;
}

export function ResumeThemeCards({
  entries,
  demoContent,
  loading,
  selectedLayoutId,
  onSelect,
  currentLayoutId,
  showCurrentBadge = false,
  gridClassName = 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4',
  loadingClassName = 'min-h-[300px]',
  loadingText,
  emptyText,
  compact = false,
  cardClassName,
  applyingLayoutId,
}: ResumeThemeCardsProps) {
  const { t } = useTranslation('editor');
  const resolvedLoadingText = loadingText ?? t('themePicker.loading');
  const resolvedEmptyText = emptyText ?? t('themePicker.empty');

  if (loading) {
    return (
      <div className={`flex items-center justify-center text-gray-400 ${loadingClassName}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#3B82F6]" />
          <p className="text-sm">{resolvedLoadingText}</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-gray-400 ${loadingClassName}`}>
        <p className="text-sm">{resolvedEmptyText}</p>
      </div>
    );
  }

  return (
    <div className={gridClassName}>
      {entries.map((entry) => {
        const isSelected = selectedLayoutId === entry.layoutId;
        const isCurrent = showCurrentBadge && currentLayoutId === entry.layoutId;
        const isApplying = applyingLayoutId === entry.layoutId;
        const previewTheme = buildResumePreviewTheme(entry);
        const previewVersion = entry.previewVersion ?? resolveLayout(entry.layoutId).previewVersion;
        const highlights = compact ? entry.highlights.slice(0, 2) : entry.highlights;

        return (
          <button
            key={`${entry.id}-${previewVersion}`}
            type="button"
            aria-label={t('themePicker.selectAria', { name: entry.name })}
            onClick={() => onSelect(entry.layoutId)}
            disabled={!!applyingLayoutId}
            className={`theme-color-transition resume-grid-card resume-theme-card relative flex cursor-pointer flex-col overflow-hidden text-left ${
              cardClassName ?? 'rounded-[22px] border border-slate-200/60 bg-white'
            } ${
              isSelected
                ? 'resume-theme-card-selected border-[#3B82F6] bg-blue-50 shadow-md shadow-blue-100/60'
                : ''
            } ${
              isApplying ? 'border-[#3B82F6] bg-blue-50/30' : ''
            } ${
              applyingLayoutId ? 'pointer-events-none' : ''
            }`}
          >
            <div className="resume-theme-preview relative aspect-[4/5] overflow-hidden bg-gray-100">
              {demoContent ? (
                <ResumeCardPreview key={`${entry.layoutId}-${previewVersion}`} content={demoContent} theme={previewTheme} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="select-none text-center text-gray-300">
                    <FileText className="mx-auto mb-2 h-10 w-10" />
                    <span className="text-xs font-medium">{entry.name}</span>
                  </div>
                </div>
              )}

              {/* Loading overlay when applying */}
              {isApplying && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" />
                    <span className="text-xs font-medium text-[#3B82F6]">{t('themePicker.applying')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className={`theme-color-transition resume-theme-card-footer border-t border-gray-50 ${compact ? 'p-2.5' : 'p-3'} ${isSelected ? 'bg-blue-50/60' : 'bg-white'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className={`resume-card-title theme-color-transition truncate text-sm font-bold leading-snug ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                    {entry.name}
                  </h4>
                  {!compact && (
                    <p className="theme-color-transition mt-0.5 line-clamp-1 text-[11px] text-gray-400">{entry.description}</p>
                  )}
                </div>
                {isCurrent && (
                  <span className="theme-color-transition resume-theme-current-badge inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('themePicker.current')}
                  </span>
                )}
              </div>
              <div className={`mt-2 flex gap-1 ${compact ? 'h-[18px] overflow-hidden' : 'flex-wrap'}`}>
                {highlights.map((highlight, index) => (
                  <span
                    key={index}
                    className={`theme-color-transition resume-theme-highlight-pill inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      isSelected ? 'bg-white text-blue-500' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>

            {isSelected && !isCurrent && (
              <div className="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6] shadow-sm">
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
