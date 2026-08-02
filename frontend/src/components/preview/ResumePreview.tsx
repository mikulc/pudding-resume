import React,{ useEffect,useLayoutEffect,useMemo,useRef,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFontStack } from '../../config/fonts';
import { useAppUI,useResume } from '../../context/ResumeContext';
import { getLayoutCSS,resolveLayout } from '../../registry/layouts';
import {
DEFAULT_SECTION_ORDER,
SectionKey,
WatermarkSettings
} from '../../types/resume';
import { renderMarkdownContent } from '../../utils/markdown';
import { useCardPreviewScope } from './ResumeCardPreviewProvider';
import {
A4_HEIGHT_MM,
A4_WIDTH_MM,
collectPaginationBoundaries,
computeProtectedPageBreaks,
MM_TO_PX,
PAGE_GAP_PX,
} from './pagination';

import { ActiveSectionWrapper,resolvePersonalPhotoStyle,SectionHeader } from './PreviewShared';
import { CertificationPreview } from './sections/CertificationPreview';
import { EducationPreview } from './sections/EducationPreview';
import { HonorPreview } from './sections/HonorPreview';
import { PersonalInfoPreview } from './sections/PersonalInfoPreview';
import { PortfolioPreview } from './sections/PortfolioPreview';
import { ProjectPreview } from './sections/ProjectPreview';
import { SkillsPreview } from './sections/SkillsPreview';
import { SummaryPreview } from './sections/SummaryPreview';
import { WorkExperiencePreview } from './sections/WorkExperiencePreview';

// Preview component map: section key to component type.
const PREVIEW_MAP: Record<SectionKey, React.ComponentType> = {
  personal: PersonalInfoPreview,
  summary: SummaryPreview,
  education: EducationPreview,
  skills: SkillsPreview,
  work: WorkExperiencePreview,
  projects: ProjectPreview,
  honors: HonorPreview,
  certifications: CertificationPreview,
  portfolio: PortfolioPreview,
};

const SIDEBAR_LAYOUT_SECTION_KEYS = new Set<SectionKey>([
  'personal',
  'skills',
  'summary',
  'certifications',
  'portfolio',
]);

function CustomSectionPreview({ sectionKey }: { sectionKey: string }) {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const customSection = data.customSections?.find((cs) => cs.id === sectionKey);

  if (!customSection || !customSection.content?.trim()) return null;

  return (
    <ActiveSectionWrapper sectionKey={sectionKey} className="mb-6">
      <SectionHeader title={customSection.name || t('module.custom')} sectionKey={sectionKey} />
      <div data-section={sectionKey} data-field="content">
        {renderMarkdownContent(customSection.content)}
      </div>
    </ActiveSectionWrapper>
  );
}

/** 濮樻潙宓冪憰鍡欐磰鐏炲偊绱伴崷銊х剨瀵姳绗傞獮鎶芥懙閸婄偓鏋╅惃鍕磹闁繑妲戦弬鍥х摟 */
function WatermarkOverlay({ settings }: { settings: WatermarkSettings }) {
  const cells = useMemo(() => {
    const densityMap = {
      low: { cols: 3, rows: 3 },
      medium: { cols: 4, rows: 4 },
      high: { cols: 5, rows: 6 },
    };
    const { cols, rows } = densityMap[settings.density];
    const result: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result.push({
          x: (c * 100) / Math.max(cols - 1, 1),
          y: (r * 100) / Math.max(rows - 1, 1),
        });
      }
    }
    return result;
  }, [settings.density]);

  return (
    <div
      data-watermark-overlay="true"
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: 'none', userSelect: 'none', zIndex: 0 }}
    >
      {cells.map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: `translate(-50%, -50%) rotate(${settings.rotation}deg)`,
            fontSize: `${settings.fontSize}px`,
            color: settings.color,
            opacity: settings.opacity,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {settings.content}
        </div>
      ))}
    </div>
  );
}

interface ResumePreviewProps {
  viewportWidth?: number;
  zoom?: number;
  onPageCountChange?: (numPages: number) => void;
  disablePagination?: boolean;
}

const SECTION_ANIM_DURATION = 'duration-500';

function escapeCssAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function scopeResumePaperCSS(css: string, layoutId: string, scopeClass?: string | null): string {
  const paperSelector = `.resume-paper[data-layout="${escapeCssAttribute(layoutId)}"]`;
  const scopedPaperSelector = scopeClass ? `.${scopeClass} ${paperSelector}` : paperSelector;
  return css.replace(/(\.resume-paper)(?![_\w-])/g, scopedPaperSelector);
}

/** Animated section wrapper using grid 0fr/1fr for smooth collapse and expand. */
function AnimatedSection({
  sectionKey,
  hidden,
  children,
}: {
  sectionKey: SectionKey;
  hidden: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`transition-all ${SECTION_ANIM_DURATION} ease-in-out`}
      data-animated-section={sectionKey}
      data-section-hidden={hidden ? 'true' : 'false'}
      style={{
        display: 'grid',
        gridTemplateRows: hidden ? '0fr' : '1fr',
        opacity: hidden ? 0 : 1,
      }}
    >
      <div className="min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function ResumePreview({ viewportWidth = 0, zoom = 1, onPageCountChange, disablePagination = false }: ResumePreviewProps) {
  const { ui } = useAppUI();
  const { data } = useResume();
  const { theme } = ui;
  const hiddenSections = data.hiddenSections ?? [];
  const scopeClass = useCardPreviewScope();

  const [needsMeasure, setNeedsMeasure] = useState(true);
  const [pageOffsets, setPageOffsets] = useState<number[]>([0]);
  const measureFlowRef = useRef<HTMLDivElement>(null);
  const layout = resolveLayout(theme.layoutId);
  const isSidebarLayout = layout.contentMode === 'sidebar';

  // Use a measurement copy without hiddenSections so hide/show changes do not
  // force remounting and break CSS transitions.
  // The measured DOM should stay mounted across visibility changes.
  const measureData = useMemo(() => {
    const { hiddenSections: _, ...rest } = data;
    return rest;
  }, [data]);

  const colorMap: Record<string, { bg: string; border: string; tagBg: string; tagText: string }> = {
    blue: { bg: '#DBEAFE', border: '#3B82F6', tagBg: '#EFF6FF', tagText: '#2563EB' },
    gray: { bg: '#F3F4F6', border: '#6B7280', tagBg: '#F9FAFB', tagText: '#4B5563' },
    black: { bg: '#E5E7EB', border: '#374151', tagBg: '#F3F4F6', tagText: '#1F2937' },
  };

  const colors = theme.colorTheme === 'custom'
    ? (theme.customColors || colorMap.blue)
    : (colorMap[theme.colorTheme] || colorMap.blue);

  // Mark for re-measurement when data or theme changes; keep old offsets to avoid flicker.
  const prevDepKey = useRef('');
  useLayoutEffect(() => {
    if (disablePagination) {
      setPageOffsets([0]);
      setNeedsMeasure(false);
      return;
    }
    const depKey = JSON.stringify(measureData) + '|' + theme.pageMargin + '|' + theme.lineSpacing + '|' + theme.fontSize + '|' + theme.layoutId + '|' + theme.fontFamily + '|' + theme.titleLayout + '|' + theme.entryTitleFontSize + '|' + theme.sectionTitleFontSize;
    if (depKey !== prevDepKey.current) {
      prevDepKey.current = depKey;
      setNeedsMeasure(true);
    }
  }, [disablePagination, measureData, theme.pageMargin, theme.lineSpacing, theme.fontSize, theme.layoutId, theme.fontFamily, theme.titleLayout, theme.entryTitleFontSize, theme.sectionTitleFontSize]);

  const pageContentHeight = (A4_HEIGHT_MM - theme.pageMargin * 2) * MM_TO_PX;

  // Measure the continuous offscreen flow and compute protected page breaks.
  // 1) Render all content into an offscreen continuous flow.
  // 2) Query DOM boundaries for entries and sections as valid break points.
  // 3) Pick the break closest to page capacity to avoid clipping text.
  useLayoutEffect(() => {
    if (!needsMeasure || disablePagination) return;

    const raf = requestAnimationFrame(() => {
      const flowRoot = measureFlowRef.current;
      if (!flowRoot) {
        return;
      }
      const measuredHeight = flowRoot.scrollHeight;
      const flowRootTop = flowRoot.getBoundingClientRect().top;
      const totalHeight = isSidebarLayout
        ? Array.from(flowRoot.querySelectorAll<HTMLElement>('[data-page-section]')).reduce((contentBottom, section) => {
            return Math.max(contentBottom, section.getBoundingClientRect().bottom - flowRootTop);
          }, 0)
        : measuredHeight;
      if (totalHeight === 0) {
        setPageOffsets([0]);
        setNeedsMeasure(false);
        return;
      }

      const { breakPoints, internalBreakPoints, protectedRanges } = collectPaginationBoundaries(flowRoot, totalHeight, pageContentHeight);
      const newPageOffsets = computeProtectedPageBreaks(breakPoints, protectedRanges, totalHeight, pageContentHeight, internalBreakPoints);
      setPageOffsets(newPageOffsets);
      setNeedsMeasure(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [disablePagination, isSidebarLayout, needsMeasure, pageContentHeight]);

  // 妞ゅ灚鏆熼崣妯哄閺冨爼鈧氨鐓￠悥鍓佺矋娴犺绱欐笟婵婄 pageOffsets 閼板矂娼?numPages閿涘瞼鈥樻穱婵囩槨濞嗏剝绁撮柌蹇涘厴闁氨鐓￠敍灞藉祮娴ｅ潡銆夐弫棰佺瑝閸欐﹫绱?
  const numPages = pageOffsets.length > 1 ? pageOffsets.length - 1 : 0;
  useEffect(() => {
    onPageCountChange?.(pageOffsets.length > 1 ? pageOffsets.length - 1 : 0);
  }, [pageOffsets, onPageCountChange]);

  // Build preview section list from sectionOrder, including built-in and custom sections.
  const sectionInfos = useMemo(() => {
    const order = data.sectionOrder ?? DEFAULT_SECTION_ORDER;
    const customSections = data.customSections ?? [];
    return order
      .filter((key) => PREVIEW_MAP[key] || customSections.some((cs) => cs.id === key))
      .map((key) => {
        const Comp = PREVIEW_MAP[key];
        if (Comp) return { key, component: <Comp /> };
        return { key, component: <CustomSectionPreview sectionKey={key} /> };
      });
  }, [data.sectionOrder, data.customSections]);

  const renderSectionFlow = (
    sections: typeof sectionInfos,
    animated: boolean,
  ) => sections.map((s) => (
    animated ? (
      <AnimatedSection key={s.key} sectionKey={s.key} hidden={hiddenSections.includes(s.key)}>
        {s.component}
      </AnimatedSection>
    ) : (
      <React.Fragment key={s.key}>
        {s.component}
      </React.Fragment>
    )
  ));

  const renderFlowContent = (
    sections: typeof sectionInfos,
    animated: boolean,
  ) => {
    if (!isSidebarLayout) {
      return renderSectionFlow(sections, animated);
    }

    const sidebarSectionKeys = layout.sidebarSections
      ? new Set<SectionKey>(layout.sidebarSections)
      : SIDEBAR_LAYOUT_SECTION_KEYS;
    const sidebarSections = sections.filter((s) => sidebarSectionKeys.has(s.key));
    const mainSections = sections.filter((s) => !sidebarSectionKeys.has(s.key));

    return (
      <>
        <aside className="left-sidebar-two-column-sidebar">
          {renderSectionFlow(sidebarSections, animated)}
        </aside>
        <main className="left-sidebar-two-column-main">
          {renderSectionFlow(mainSections, animated)}
        </main>
      </>
    );
  };

  const paperStyle: React.CSSProperties & {
    '--resume-content-height': string;
    '--resume-page-margin': string;
    '--resume-line-spacing': number;
    '--personal-photo-width': string;
    '--personal-photo-height': string;
  } = {
    padding: isSidebarLayout ? 0 : `${theme.pageMargin}mm`,
    fontSize: `${theme.fontSize}px`,
    lineHeight: theme.lineSpacing,
    fontFamily: getFontStack(theme.fontFamily),
    boxSizing: 'border-box',
    '--resume-content-height': `${pageContentHeight}px`,
    '--resume-page-margin': `${theme.pageMargin}mm`,
    '--resume-line-spacing': theme.lineSpacing,
    '--personal-photo-width': `${resolvePersonalPhotoStyle(data.personalInfo.photoStyle).width}px`,
    '--personal-photo-height': `${resolvePersonalPhotoStyle(data.personalInfo.photoStyle).height}px`,
  };

  const colorStyle = `
    .resume-paper {
      --theme-bg: ${colors.bg};
      --theme-border: ${colors.border};
      --theme-tag-bg: ${colors.tagBg};
      --theme-tag-text: ${colors.tagText};
      --layout-accent: ${colors.border};
      --layout-tag-border: ${colors.tagText};
      --section-title-size: ${theme.sectionTitleFontSize}px;
      --entry-title-size: ${theme.entryTitleFontSize}px;
      font-family: ${getFontStack(theme.fontFamily)} !important;
      line-height: var(--resume-line-spacing) !important;
    }
    .resume-paper [data-page-section] :where(p, li, div, span) {
      line-height: var(--resume-line-spacing) !important;
    }
    .resume-paper .section-header {
      background-color: var(--theme-bg) !important;
      color: var(--theme-border) !important;
      border-bottom-color: var(--theme-border) !important;
    }
    .resume-paper .section-header-bar {
      background-color: var(--theme-border) !important;
    }
    .resume-paper .tag-badge {
      background-color: var(--theme-tag-bg) !important;
      color: var(--theme-tag-text) !important;
    }
  `;


  // Resolve CSS for the current layout; unknown layoutId returns empty CSS.
  const layoutCSS = getLayoutCSS(theme.layoutId);
  const titleRowCSS = `
    .resume-paper [data-page-section] .entry-title-row {
      --entry-title-row-height: calc(var(--entry-title-size, 1em) * 1.5);
      line-height: var(--entry-title-row-height) !important;
      min-height: var(--entry-title-row-height);
    }
    .resume-paper [data-page-section] .entry-title-row :where(div, span) {
      line-height: inherit !important;
    }
    .resume-paper [data-page-section] .entry-title-row > .min-w-0 {
      display: flex;
      align-items: baseline;
    }
  `;
  const resumeContentCSS = `
    .resume-paper[data-layout] :is(p, li, span, div).text-gray-700,
    .resume-paper[data-layout] :is(p, li, span, div).text-gray-600,
    .resume-paper[data-layout] :is(p, li, span, div).text-gray-500,
    .resume-paper[data-layout] :is(p, li, span, div).text-gray-400,
    .resume-paper[data-layout] [data-section-field="markdown-p"],
    .resume-paper[data-layout] [data-section-field="markdown-ol"] > li,
    .resume-paper[data-layout] [data-section-field="markdown-ul"] > li,
    .resume-paper[data-layout] ul.list-none > li {
      color: #333333 !important;
    }

    .resume-paper[data-layout] ul.list-none li > span.resume-list-marker:first-child,
    .resume-paper[data-layout] .resume-list-marker--ordered,
    .resume-paper[data-layout] [data-section-field="markdown-ol"] > li::marker {
      color: #333333 !important;
      font-weight: 400 !important;
    }
    .resume-paper[data-layout] ul.list-none li > span.resume-list-marker--bullet:first-child,
    .resume-paper[data-layout] .resume-list-marker--bullet {
      display: inline-block !important;
      color: #333333 !important;
      font-size: 1.18em !important;
      font-weight: 400 !important;
      line-height: 1 !important;
      vertical-align: -0.03em !important;
    }
    .resume-paper[data-layout] [data-section-field="markdown-ul"] > li::marker {
      color: #333333 !important;
      font-size: 1.18em !important;
      font-weight: 400 !important;
    }
  `;

  // Scope CSS to the current layout to avoid cross-preview contamination.
  const cssContent = scopeResumePaperCSS(`${colorStyle}${layoutCSS}${resumeContentCSS}${titleRowCSS}`, theme.layoutId, scopeClass);
  const sidebarShellClassName = 'left-sidebar-two-column-shell';
  const sidebarPagedShellClassName = 'left-sidebar-two-column-shell left-sidebar-two-column-paged-flow';

  const isMultiPage = !disablePagination && numPages > 1;
  const pageWidth = A4_WIDTH_MM * MM_TO_PX;
  const twoColumnWidth = pageWidth * 2 + PAGE_GAP_PX;
  const canUseTwoColumns = isMultiPage && numPages > 1 && viewportWidth / zoom >= twoColumnWidth;
  const pagesWrapperWidth = canUseTwoColumns ? twoColumnWidth : pageWidth;

  const watermarkEl = theme.watermark.enabled ? (
    <WatermarkOverlay settings={theme.watermark} />
  ) : null;

  // Offscreen measurement element: render all sections continuously without
  // overflow clipping, then query exact item/section positions for page breaks.
  const measurePaper = (
    <div
      className="resume-paper"
      data-layout={theme.layoutId}
      style={{ ...paperStyle, position: 'relative' }}
    >
      <style key={`${scopeClass ?? 'global'}-${theme.layoutId}-measure`}>{cssContent}</style>
      <div
        ref={measureFlowRef}
        data-page-flow-root
        className={isSidebarLayout ? sidebarPagedShellClassName : undefined}
        style={isSidebarLayout ? { '--resume-content-height': '0px' } as React.CSSProperties : undefined}
      >
        {renderFlowContent(
          sectionInfos.filter((s) => !hiddenSections.includes(s.key)),
          false,
        )}
      </div>
    </div>
  );

  const hiddenMeasureEl = !disablePagination && needsMeasure ? (
    <div
      key="hidden-measure"
      style={{
        position: 'fixed',
        top: 0,
        left: '-9999px',
        visibility: 'hidden',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {measurePaper}
    </div>
  ) : null;

  // ========== 婢舵岸銆夊Ο鈥崇础 ==========
  // 鏉╃偟鐢婚崘鍛啇闁俺绻?translateY 鐟欏棗褰涚粣妤€褰涢崚鍡涖€夌仦鏇犮仛閿涘本鐦℃い鐢哥彯鎼达妇鏁遍弲楦垮厴閸掑棝銆夌粻妤佺《
  // Decide page breaks from item boundaries to avoid cutting through text lines or entries.
  if (isMultiPage) {
    const multiPageContent = (
      <>
        {hiddenMeasureEl}
        <div
          className="resume-pages-wrapper"
          data-pagination-state={needsMeasure && !disablePagination ? 'measuring' : 'ready'}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: `${PAGE_GAP_PX}px`,
            justifyContent: 'center',
            width: `${pagesWrapperWidth}px`,
          }}
        >
          <style key={`${scopeClass ?? 'global'}-${theme.layoutId}-pages`}>{cssContent}</style>
          {Array.from({ length: numPages }, (_, pageIndex) => {
            const pageStart = pageOffsets[pageIndex];
            const pageEnd = pageOffsets[pageIndex + 1];
            const pageHeight = pageEnd - pageStart;
            return (
              <div
                key={pageIndex}
                className="resume-paper"
                data-layout={theme.layoutId}
                data-page-index={pageIndex}
                style={{
                  ...paperStyle,
                  height: `${A4_HEIGHT_MM}mm`,
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {watermarkEl}
                  <div style={{
                  position: 'relative',
                  zIndex: 1,
                  height: `${pageHeight}px`,
                  marginTop: isSidebarLayout ? `${theme.pageMargin}mm` : undefined,
                  overflow: 'hidden',
                }}>
                  <div style={{ transform: `translateY(-${pageStart}px)` }}>
                    <div className={isSidebarLayout ? sidebarPagedShellClassName : undefined}>
                      {renderFlowContent(sectionInfos, true)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );

    return scopeClass ? (
      <div className={scopeClass}>{multiPageContent}</div>
    ) : (
      multiPageContent
    );
  }

  // ========== 閸楁洟銆夊Ο鈥崇础 ==========
  const paperEl = (
    <div
      className="resume-paper"
      data-layout={theme.layoutId}
      data-pagination-state={needsMeasure && !disablePagination ? 'measuring' : 'ready'}
      style={{ ...paperStyle, position: 'relative', overflow: 'hidden' }}
    >
      <style key={`${scopeClass ?? 'global'}-${theme.layoutId}-single`}>{cssContent}</style>
      {watermarkEl}
      <div
        className={isSidebarLayout ? sidebarShellClassName : undefined}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {renderFlowContent(sectionInfos, true)}
      </div>
    </div>
  );

  return (
    <>
      {hiddenMeasureEl}
      {scopeClass ? (
        <div className={scopeClass}>{paperEl}</div>
      ) : (
        paperEl
      )}
    </>
  );
}
