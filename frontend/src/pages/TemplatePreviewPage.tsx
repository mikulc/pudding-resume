import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronLeft, Loader2 } from 'lucide-react';
import { ResumePreview } from '../components/preview/PreviewComponents';
import { ResumeCardPreviewProvider } from '../components/preview/ResumeCardPreviewProvider';
import { FontPreloader } from '../components/common/FontPreloader';
import { buildResumePreviewTheme } from '../components/layout/ResumeThemePicker';
import { useResumeTemplateLibrary } from '../components/template/ResumeTemplateLibrary';
import { useCreateResumeFromTemplate } from '../components/template/useCreateResumeFromTemplate';
import { calculateFitPreviewZoom } from '../utils/previewZoom';
import type { TemplateLibraryEntry } from '../types/resume';

interface TemplatePreviewCanvasProps {
  entry: TemplateLibraryEntry;
  onBack: () => void;
  onUse: () => void;
}

function TemplatePreviewCanvas({ entry, onBack, onUse }: TemplatePreviewCanvasProps) {
  const { t } = useTranslation(['resume', 'common']);
  const theme = useMemo(() => buildResumePreviewTheme(entry.defaultTheme), [entry.defaultTheme]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [viewportWidth, setViewportWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia('(max-width: 768px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const setPreviewContentRef = useCallback((node: HTMLDivElement | null) => {
    previewContentRef.current = node;
  }, []);

  useLayoutEffect(() => {
    const node = previewContentRef.current;
    if (!node) return;

    const updateSize = () => {
      setPreviewSize({ width: node.offsetWidth, height: node.offsetHeight });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) return;

    const horizontalPadding = isMobile ? 24 : 64;
    const updateViewport = () => {
      setViewportWidth(Math.max(0, node.clientWidth - horizontalPadding));
      setZoom(calculateFitPreviewZoom(node.clientWidth, horizontalPadding, 1));
    };

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isMobile]);

  const gridSize = Math.max(12, Math.round(24 * zoom));

  return (
    <ResumeCardPreviewProvider content={entry.content} theme={theme} suppressWatermark>
      <FontPreloader fontFamilyId={theme.typography.fontFamily ?? 'noto-sans-sc'} />
      <div className="flex h-screen min-h-0 flex-col bg-slate-50 dark:bg-gray-900">
        <header className="relative z-10 h-[60px] flex-shrink-0 bg-white after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gray-200 after:content-[''] dark:bg-gray-800 dark:after:bg-transparent">
          <div className="mx-auto flex h-full w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-9 flex-shrink-0 items-center justify-center gap-1 rounded-xl px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-[#425aef] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2248ff]/30 dark:text-gray-300 dark:hover:!bg-[#fbbf24] dark:hover:!text-[#17191d] dark:focus-visible:ring-[#fbbf24]/30 sm:px-3"
                aria-label={t('resume:templatesPage.backToList')}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{t('common:back')}</span>
              </button>
              <span className="h-4 w-px flex-shrink-0 bg-gray-200 dark:bg-gray-600" aria-hidden="true" />
              <h1 className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100 sm:text-[15px]">
                {entry.name}
              </h1>
            </div>

            <button
              type="button"
              onClick={onUse}
              className="inline-flex h-9 flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--theme-accent)] px-3.5 text-sm font-semibold text-[var(--theme-accent-foreground)] shadow-sm transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:ring-offset-2 active:brightness-95 dark:focus-visible:ring-offset-gray-800 sm:px-4"
            >
              {t('resume:templatesPage.useThis')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          <div
            ref={scrollContainerRef}
            className="theme-transition-stable absolute inset-0 overflow-auto px-3 pb-0 pt-4 hide-scrollbar sm:px-8 sm:pt-6"
            style={{
              backgroundColor: 'var(--canvas-bg)',
              backgroundImage: `
                linear-gradient(var(--canvas-grid) 1px, transparent 1px),
                linear-gradient(90deg, var(--canvas-grid) 1px, transparent 1px)
              `,
              backgroundPosition: 'center top',
              backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
          >
            <div
              className="relative mx-auto"
              style={{
                width: previewSize.width ? `${previewSize.width * zoom}px` : 'max-content',
                height: previewSize.height ? `${previewSize.height * zoom + 24}px` : 'auto',
                maxWidth: previewSize.width ? 'none' : `${100 / zoom}%`,
              }}
            >
              <div
                ref={setPreviewContentRef}
                className="theme-transition-stable"
                style={{
                  position: previewSize.width ? 'absolute' : 'relative',
                  left: 0,
                  top: 0,
                  width: 'max-content',
                  maxWidth: previewSize.width ? 'none' : `${100 / zoom}%`,
                  transform: previewSize.width
                    ? `translateX(${(previewSize.width * (zoom - 1)) / 2}px) scale(${zoom})`
                    : `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                <ResumePreview viewportWidth={viewportWidth} zoom={zoom} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </ResumeCardPreviewProvider>
  );
}

export default function TemplatePreviewPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('resume');
  const { entries, loading } = useResumeTemplateLibrary(true);
  const { creatingLayoutId, createFromTemplate } = useCreateResumeFromTemplate();
  const entry = entries.find((item) => item.id === templateId);

  useLayoutEffect(() => {
    document.documentElement.classList.add('resume-route-fullscreen');
    document.body.classList.add('resume-route-fullscreen');
    return () => {
      document.documentElement.classList.remove('resume-route-fullscreen');
      document.body.classList.remove('resume-route-fullscreen');
    };
  }, []);

  if (loading || creatingLayoutId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
          <span className="text-sm">
            {creatingLayoutId ? t('templatesPage.enteringEditor') : t('templatesPage.loading')}
          </span>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-page)] px-6 text-center">
        <p className="text-sm text-gray-500">{t('templatesPage.notFound')}</p>
        <button
          type="button"
          onClick={() => navigate('/templates', { replace: true })}
          className="inline-flex h-9 items-center gap-1 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('templatesPage.backToList')}
        </button>
      </div>
    );
  }

  return (
    <TemplatePreviewCanvas
      entry={entry}
      onBack={() => navigate('/templates')}
      onUse={() => void createFromTemplate(entry)}
    />
  );
}
