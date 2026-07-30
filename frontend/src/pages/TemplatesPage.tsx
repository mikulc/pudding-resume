import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import { useToast } from '../components/common/Toast';
import {
  LazyResumeCardPreview,
  ResumeCardPreview,
} from '../components/preview/ResumeCardPreview';
import { EmptyResumePreview } from '../components/preview/ResumePreviewSkeleton';
import {
  ALL_THEME_CATEGORY,
  buildResumePreviewTheme,
  deriveCategories,
  filterResumeThemeEntries,
  useResumeThemeLibrary,
} from '../components/layout/ResumeThemePicker';
import { createResume, setResumeCache } from '../api/resumes';
import { getAuthToken } from '../utils/api';
import { isLocalStorageEnabled } from '../context/AuthContext';
import { generateLocalId, saveResumeToLocal } from '../utils/localStorage';
import { setPreviewCache } from '../utils/previewCache';
import {
  clearResumeLaunchSession,
  stageDraftResumeLaunch,
  stageLocalResumeLaunch,
} from '../utils/resumeLaunch';
import { createEmptyResumeData, createInitialThemeSettings } from '../utils/resumeDraft';
import { getLayoutDefaultColor, getLayoutName } from '../registry/layouts';
import type { StyleLibraryEntry } from '../types/resume';
import { lockModalScroll } from '../utils/modalScrollLock';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('resume');
  const { showToast } = useToast();
  const [creatingLayoutId, setCreatingLayoutId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(ALL_THEME_CATEGORY);
  const [previewEntry, setPreviewEntry] = useState<StyleLibraryEntry | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { entries, demoContent, loading } = useResumeThemeLibrary(!creatingLayoutId);

  const categories = useMemo(() => deriveCategories(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterResumeThemeEntries(entries, activeCategory),
    [entries, activeCategory],
  );
  const previewIndex = useMemo(
    () => previewEntry ? filteredEntries.findIndex((entry) => entry.id === previewEntry.id) : -1,
    [filteredEntries, previewEntry],
  );

  const navigatePreview = useCallback((offset: -1 | 1) => {
    setPreviewEntry((current) => {
      if (!current) return null;
      const currentIndex = filteredEntries.findIndex((entry) => entry.id === current.id);
      const nextEntry = filteredEntries[currentIndex + offset];
      return nextEntry ?? current;
    });
  }, [filteredEntries]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  useEffect(() => {
    if (!previewEntry) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewEntry(null);
      if (event.key === 'ArrowLeft') navigatePreview(-1);
      if (event.key === 'ArrowRight') navigatePreview(1);
    };

    const unlockModalScroll = lockModalScroll();
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unlockModalScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigatePreview, previewEntry]);

  const handleCreateFromTemplate = useCallback(async (entry: StyleLibraryEntry) => {
    if (creatingLayoutId) return;

    clearResumeLaunchSession();

    const layoutId = entry.layoutId;
    const themeColor = entry.previewColors?.accentBar || getLayoutDefaultColor(layoutId);
    const resumeData = demoContent ?? createEmptyResumeData();
    const settings = createInitialThemeSettings(layoutId, themeColor);
    const resumeName = t('templatesPage.untitledResume');

    flushSync(() => setCreatingLayoutId(layoutId));

    try {
      if (getAuthToken()) {
        const created = await createResume(resumeData, resumeName, settings);
        setResumeCache(created.id, {
          id: created.id,
          name: created.name,
          content: created.content || resumeData,
          settings: created.settings || settings,
        });
        navigate(`/resume/${created.id}`);
        return;
      }

      if (isLocalStorageEnabled()) {
        const localId = generateLocalId();
        const saved = await saveResumeToLocal({
          id: localId,
          name: resumeName,
          content: resumeData,
          settings,
          updated_at: new Date().toISOString(),
        });

        if (!saved) {
          throw new Error(t('templatesPage.saveFailed'));
        }

        stageLocalResumeLaunch({ id: localId, name: resumeName, data: resumeData, settings });
        setPreviewCache(localId, resumeData, settings);
        navigate(`/resume/${localId}`);
        return;
      }

      stageDraftResumeLaunch({ layoutId, themeColor, templateData: demoContent ?? undefined });
      navigate('/resume');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('templatesPage.saveFailed');
      showToast(message, 'error');
      setCreatingLayoutId(null);
    }
  }, [creatingLayoutId, demoContent, navigate, showToast, t]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-900 flex flex-col theme-color-transition">
      <header className="fixed top-0 inset-x-0 z-50 bg-[var(--bg-header)] backdrop-blur-xl border-b border-gray-100 theme-color-transition">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-14 sm:pt-[60px] min-h-0">
        {creatingLayoutId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
              <span className="text-sm">{t('templatesPage.enteringEditor')}</span>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1e2836] rounded-full animate-spin" />
              <p className="text-sm">{t('templatesPage.loading')}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0">
              <div className="mx-auto w-full max-w-[1360px] px-6 pb-4 pt-8 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-gray-900">
                      {t('templatesPage.title')}
                    </h1>
                    <span className="inline-flex h-6 flex-shrink-0 items-center rounded-full bg-slate-100 px-[9px] text-xs font-semibold text-[#3f5f8a]">
                      {t('templatesPage.count', { count: entries.length })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-[1.5] text-[#667085]">
                    {t('templatesPage.description')}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 pb-1 sm:flex-nowrap sm:overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full px-4 text-[15px] font-bold tracking-normal transition-colors ${activeCategory === cat
                          ? 'bg-[#2248ff] text-white dark:bg-[#fbbf24] dark:text-[#17191d]'
                          : 'text-gray-800 hover:bg-[#2248ff] hover:text-white dark:text-[color:var(--text-secondary)] dark:hover:bg-[#fbbf24] dark:hover:text-[#17191d]'
                        }`}
                    >
                      {cat === ALL_THEME_CATEGORY
                        ? t('templatesPage.categories.all')
                        : t(`templatesPage.categories.${cat}`, { defaultValue: cat })}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1360px] px-6 py-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]" data-global-toolbar-content>
                {filteredEntries.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-gray-400">
                    <p className="text-sm">{t('templatesPage.empty')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
                    {filteredEntries.map((entry) => {
                      const previewTheme = buildResumePreviewTheme(entry);

                      return (
                        <div key={entry.id} className="relative group w-full">
                          <div className="resume-grid-card theme-color-transition w-full rounded-[22px] border border-slate-200/60 overflow-hidden relative">
                            <div className="pointer-events-none invisible" aria-hidden="true">
                              <div className="aspect-[4/5] w-full" />
                              <div className="resume-grid-card-footer-spacer" />
                            </div>

                            <div className="resume-grid-card-preview absolute inset-0 z-0 h-full w-full block bg-white overflow-hidden">
                              <div className="resume-grid-card-preview-surface absolute inset-0 bg-gray-100">
                                {demoContent ? (
                                  <LazyResumeCardPreview
                                    content={demoContent}
                                    theme={previewTheme}
                                    scrollRootRef={scrollContainerRef}
                                  />
                                ) : (
                                  <EmptyResumePreview />
                                )}
                              </div>
                            </div>

                            <div
                              className="resume-grid-card-footer absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-slate-100/80"
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <div className="pointer-events-none absolute inset-0 flex min-w-0 -translate-y-1 items-center justify-between gap-2 px-4 opacity-0 transition-all duration-200 sm:pointer-events-auto sm:translate-y-0 sm:opacity-100 sm:group-hover:pointer-events-none sm:group-hover:-translate-y-1 sm:group-hover:opacity-0 sm:group-focus-within:pointer-events-none sm:group-focus-within:-translate-y-1 sm:group-focus-within:opacity-0">
                                <h3 className="resume-card-title min-w-0 font-semibold text-slate-900 truncate text-sm">
                                  {entry.name}
                                </h3>
                                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100/70 text-slate-500 text-[10px] font-medium border border-slate-200/70">
                                  {getLayoutName(entry.layoutId)}
                                </span>
                              </div>
                              <div className="pointer-events-auto absolute inset-0 flex translate-y-0 items-center gap-2 p-2 opacity-100 transition-all duration-200 sm:pointer-events-none sm:translate-y-1 sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => setPreviewEntry(entry)}
                                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#2248ff]/40 hover:bg-[#2248ff]/5 hover:text-[#2248ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2248ff]/30"
                                  aria-label={t('templatesPage.previewAria', { name: entry.name })}
                                >
                                  <Eye className="h-4 w-4" />
                                  {t('templatesPage.preview')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleCreateFromTemplate(entry)}
                                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2248ff] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#193be0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2248ff]/35 dark:bg-[#fbbf24] dark:text-[#17191d] dark:hover:bg-[#f6b914]"
                                  aria-label={t('templatesPage.useAria', { name: entry.name })}
                                >
                                  {t('templatesPage.use')}
                                  <ArrowRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      {previewEntry &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={() => setPreviewEntry(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="template-preview-title"
              className="modal-dialog-enter flex h-[min(92vh,900px)] w-full max-w-[680px] flex-col overflow-hidden rounded-[20px] border border-white/20 bg-[var(--bg-card)] shadow-[0_28px_90px_rgba(15,23,42,0.35)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header className="flex h-14 flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200/70 px-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewEntry(null)}
                    className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    aria-label={t('templatesPage.backToList')}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <h2 id="template-preview-title" className="truncate text-[15px] font-bold text-slate-900">
                      {previewEntry.name}
                    </h2>
                  </div>
                </div>
              </header>

              <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-slate-100/80 p-4 sm:p-5 dark:bg-black/15">
                <div className="relative aspect-[210/297] h-full max-h-full max-w-full overflow-hidden rounded-md bg-white shadow-[0_14px_45px_rgba(15,23,42,0.16)]">
                  {demoContent ? (
                    <ResumeCardPreview
                      content={demoContent}
                      theme={buildResumePreviewTheme(previewEntry)}
                    />
                  ) : (
                    <EmptyResumePreview />
                  )}
                </div>
              </div>

              <footer className="flex h-[60px] flex-shrink-0 items-center justify-between gap-3 border-t border-slate-200/70 bg-[var(--bg-card)] px-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigatePreview(-1)}
                    disabled={previewIndex <= 0}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 dark:bg-transparent"
                    aria-label={t('templatesPage.previousAria')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>{t('templatesPage.previous')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigatePreview(1)}
                    disabled={previewIndex < 0 || previewIndex >= filteredEntries.length - 1}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 dark:bg-transparent"
                    aria-label={t('templatesPage.nextAria')}
                  >
                    <span>{t('templatesPage.next')}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const entry = previewEntry;
                    setPreviewEntry(null);
                    void handleCreateFromTemplate(entry);
                  }}
                  className="inline-flex h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#2248ff] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#193be0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2248ff]/35 dark:bg-[#fbbf24] dark:text-[#17191d] dark:hover:bg-[#f6b914]"
                >
                  {t('templatesPage.useThis')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </footer>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
