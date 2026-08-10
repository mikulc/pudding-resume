import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Eye, Loader2 } from 'lucide-react';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import {
  LazyResumeCardPreview,
} from '../components/preview/ResumeCardPreview';
import { EmptyResumePreview } from '../components/preview/ResumePreviewSkeleton';
import {
  buildResumePreviewTheme,
} from '../components/layout/ResumeThemePicker';
import {
  ALL_TEMPLATE_CATEGORY,
  deriveTemplateCategories,
  filterResumeTemplates,
  useResumeTemplateLibrary,
} from '../components/template/ResumeTemplateLibrary';
import { useCreateResumeFromTemplate } from '../components/template/useCreateResumeFromTemplate';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('resume');
  const { creatingLayoutId, createFromTemplate } = useCreateResumeFromTemplate();
  const [activeCategory, setActiveCategory] = useState(ALL_TEMPLATE_CATEGORY);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { entries, loading } = useResumeTemplateLibrary(!creatingLayoutId);

  const categories = useMemo(() => deriveTemplateCategories(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterResumeTemplates(entries, activeCategory),
    [entries, activeCategory],
  );
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

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
                          ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)]'
                          : 'text-gray-800 hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] dark:text-[color:var(--text-secondary)]'
                        }`}
                    >
                      {cat === ALL_TEMPLATE_CATEGORY
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
                      const previewTheme = buildResumePreviewTheme(entry.defaultTheme);

                      return (
                        <div key={entry.id} className="relative group w-full">
                          <div className="resume-grid-card theme-color-transition w-full rounded-[22px] border border-slate-200/60 overflow-hidden relative">
                            <div className="pointer-events-none invisible" aria-hidden="true">
                              <div className="aspect-[4/5] w-full" />
                              <div className="resume-grid-card-footer-spacer" />
                            </div>

                            <div className="resume-grid-card-preview absolute inset-0 z-0 h-full w-full block bg-white overflow-hidden">
                              <div className="resume-grid-card-preview-surface absolute inset-0 bg-gray-100">
                                {entry.content ? (
                                  <LazyResumeCardPreview
                                    content={entry.content}
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
                                  {entry.industry}
                                </span>
                              </div>
                              <div className="pointer-events-auto absolute inset-0 flex translate-y-0 items-center gap-2 p-2 opacity-100 transition-all duration-200 sm:pointer-events-none sm:translate-y-1 sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/templates/${encodeURIComponent(entry.id)}/preview`)}
                                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:!border-[var(--theme-accent)] hover:!bg-[var(--theme-accent-soft)] hover:!text-[var(--theme-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]"
                                  aria-label={t('templatesPage.previewAria', { name: entry.name })}
                                >
                                  <Eye className="h-4 w-4" />
                                  {t('templatesPage.preview')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void createFromTemplate(entry)}
                                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-accent)] px-3 text-sm font-semibold text-[var(--theme-accent-foreground)] shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]"
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
    </div>
  );
}
