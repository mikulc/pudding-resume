import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Hand, Minus, Plus, Maximize2, Download, FileText, Image, FileCode2, FileJson } from 'lucide-react';
import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { ResumePreview } from '../preview/PreviewComponents';
import { ResumeCardPreviewProvider } from '../preview/ResumeCardPreviewProvider';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import type { SharedResumeResponse } from '../../api/share';
import type { ThemeSettings } from '../../types/resume';
import { useExportPDF } from '../../hooks/useExportPDF';
import { useExportPNG } from '../../hooks/useExportPNG';
import { useExportMarkdown } from '../../hooks/useExportMarkdown';
import { useExportJSON } from '../../hooks/useExportJSON';
import { CanvasFloatingToolbar } from '../preview/CanvasFloatingToolbar';
import { NavbarAuth } from '../auth/NavbarAuth';
import { Tooltip } from '../common/Tooltip';
import LogoIcon from '../common/LogoIcon';
import { FontPreloader } from '../common/FontPreloader';
import { ExportProgressDock } from '../common/ExportProgressDock';
import {
  calculateFitPreviewZoom,
  MAX_PREVIEW_ZOOM,
  MIN_PREVIEW_ZOOM,
  previewZoomFromWheel,
  stepPreviewZoom,
} from '../../utils/previewZoom';

interface SharedResumeViewProps {
  data: SharedResumeResponse;
}

interface CanvasPanStart {
  pointerX: number;
  pointerY: number;
  panOffsetX: number;
  panOffsetY: number;
}

/**
 * 外层组件：提供 ResumeCardPreviewProvider 上下文，
 * 保证内部使用的 export hooks 处于正确的 Provider 树中。
 */
export function SharedResumeView({ data }: SharedResumeViewProps) {
  const settings: ThemeSettings | undefined = data.resume.settings;

  return (
    <ResumeCardPreviewProvider
      content={data.resume.content}
      theme={settings}
      suppressWatermark={false}
    >
      <FontPreloader fontFamilyId={settings?.fontFamily ?? 'system'} />
      <SharedResumeViewInner data={data} />
    </ResumeCardPreviewProvider>
  );
}

/** 内层组件：包含所有依赖 ResumeContext / AppUIContext 的逻辑 */
function SharedResumeViewInner({ data }: SharedResumeViewProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(['resume', 'common', 'editor', 'homepage']);

  // ---- Zoom state ----
  const [zoom, setZoom] = useState(1);
  const initialFitDoneRef = useRef(false);

  // ---- Canvas pan state ----
  const [canvasMoveActive, setCanvasMoveActive] = useState(false);
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const canvasPanStartRef = useRef<CanvasPanStart | null>(null);
  const canvasPanPointerIdRef = useRef<number | null>(null);
  const ignoreNextMouseUpRef = useRef(false);
  const spacePanActiveRef = useRef(false);

  // ---- Mobile toolbar collapse ----
  const [mobileToolbarCollapsed, setMobileToolbarCollapsed] = useState(false);

  // ---- Refs ----
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [viewportWidth, setViewportWidth] = useState(0);

  // ---- Mobile detection ----
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ---- Export hooks (now inside ResumeCardPreviewProvider) ----
  const { previewRef: exportRef, exportPDF, isExporting: isExportingPDF, exportProgress: pdfExportProgress } = useExportPDF();
  const { exportPNG, isExportingPNG, exportProgress: pngExportProgress } = useExportPNG(exportRef);
  const { exportMarkdown, isExportingMD } = useExportMarkdown();
  const { exportJSON, isExportingJSON } = useExportJSON();

  // ---- Export menu state ----
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const isExporting = isExportingPDF || isExportingPNG || isExportingMD || isExportingJSON;
  const isZoomReset = Math.abs(zoom - 1) < 0.005;

  // ---- Export menu: click outside & escape ----
  useOutsideClick({
    open: showExportMenu,
    refs: [exportMenuRef, exportBtnRef],
    onOutsideClick: () => setShowExportMenu(false),
  });

  useEffect(() => {
    if (!showExportMenu) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExportMenu(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showExportMenu]);

  useEffect(() => {
    if (isExporting) setShowExportMenu(false);
  }, [isExporting]);

  const handleExportOption = useCallback(
    (format: 'pdf' | 'png' | 'md' | 'json') => {
      setShowExportMenu(false);
      if (format === 'pdf') exportPDF(data.resume.id);
      else if (format === 'png') exportPNG(data.resume.id);
      else if (format === 'md') exportMarkdown();
      else exportJSON();
    },
    [exportPDF, exportPNG, exportMarkdown, exportJSON, data.resume.id],
  );

  const bottomGap = isMobile ? 104 : 72;

  // ---- Measure preview content size ----
  const setPreviewContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      previewContentRef.current = node;
      (exportRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [exportRef],
  );

  useLayoutEffect(() => {
    const node = previewContentRef.current;
    if (!node) return;
    const updateSize = () => {
      setPreviewSize({
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) return;
    const updateWidth = () => {
      setViewportWidth(Math.max(0, node.clientWidth - (isMobile ? 24 : 64)));
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isMobile]);

  // ---- Initial fit-to-width ----
  useEffect(() => {
    if (initialFitDoneRef.current) return;
    const container = scrollContainerRef.current;
    if (!container || container.clientWidth <= 0) return;
    const fitScale = calculateFitPreviewZoom(container.clientWidth, isMobile ? 24 : 64, 1);
    initialFitDoneRef.current = true;
    if (fitScale < 1) {
      setZoom(fitScale);
    }
  }, [isMobile]);

  // ---- Zoom controls ----
  const handleZoomIn = useCallback(() => setZoom((value) => stepPreviewZoom(value, 0.1)), []);
  const handleZoomOut = useCallback(() => setZoom((value) => stepPreviewZoom(value, -0.1)), []);
  const resetPanOffset = useCallback(() => {
    setPanOffsetX(0);
    setPanOffsetY(0);
  }, []);
  const handleResetZoom = useCallback(() => {
    resetPanOffset();
    setZoom(1);
  }, [resetPanOffset]);
  const handleFitToWidth = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setZoom(calculateFitPreviewZoom(container.clientWidth, isMobile ? 24 : 64));
    resetPanOffset();
  }, [isMobile, resetPanOffset]);

  // ---- Ctrl+wheel zoom ----
  useEffect(() => {
    const handleCtrlWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      setZoom((value) => previewZoomFromWheel(value, event.deltaY));
    };
    const options: AddEventListenerOptions = { passive: false, capture: true };
    document.addEventListener('wheel', handleCtrlWheel, options);
    return () => document.removeEventListener('wheel', handleCtrlWheel, options);
  }, []);

  // ---- Canvas move toggle ----
  const handleToggleCanvasMove = useCallback(() => {
    spacePanActiveRef.current = false;
    setCanvasMoveActive((active) => !active);
  }, []);

  useEffect(() => {
    if (!canvasMoveActive) {
      canvasPanStartRef.current = null;
      canvasPanPointerIdRef.current = null;
      setIsCanvasPanning(false);
    }
  }, [canvasMoveActive]);

  useEffect(() => {
    if (!isCanvasPanning) return;
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    return () => {
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [isCanvasPanning]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canvasMoveActive) {
        e.preventDefault();
        spacePanActiveRef.current = false;
        setCanvasMoveActive(false);
        setIsCanvasPanning(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [canvasMoveActive]);

  // Space 键临时进入移动画布模式（按住生效，松开退出）
  useEffect(() => {
    const handleSpaceDown = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.code !== 'Space') return;
      if (event.repeat) return;

      const target = event.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      if (!canvasMoveActive) {
        event.preventDefault();
        spacePanActiveRef.current = true;
        setCanvasMoveActive(true);
      }
    };

    const handleSpaceUp = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.code !== 'Space') return;

      const target = event.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      if (spacePanActiveRef.current) {
        event.preventDefault();
        spacePanActiveRef.current = false;
        setCanvasMoveActive(false);
        setIsCanvasPanning(false);
      }
    };

    window.addEventListener('keydown', handleSpaceDown);
    window.addEventListener('keyup', handleSpaceUp);

    return () => {
      window.removeEventListener('keydown', handleSpaceDown);
      window.removeEventListener('keyup', handleSpaceUp);
    };
  }, [canvasMoveActive]);

  // ---- Canvas pan handlers ----
  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if (!canvasMoveActive) {
        return;
      }
      const container = scrollContainerRef.current;
      if (!container) return;
      event.preventDefault();
      event.stopPropagation();
      canvasPanStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        panOffsetX,
        panOffsetY,
      };
      canvasPanPointerIdRef.current = event.pointerId;
      ignoreNextMouseUpRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsCanvasPanning(true);
    },
    [canvasMoveActive, panOffsetX, panOffsetY],
  );

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isCanvasPanning || canvasPanPointerIdRef.current !== event.pointerId) return;
      const panStart = canvasPanStartRef.current;
      if (!panStart) return;
      event.preventDefault();
      event.stopPropagation();

      const dx = event.clientX - panStart.pointerX;
      const dy = event.clientY - panStart.pointerY;
      let newPanX = panStart.panOffsetX + dx;
      let newPanY = panStart.panOffsetY + dy;

      // 边界限制：保证至少有部分内容始终可见
      const container = scrollContainerRef.current;
      if (container && previewSize.width > 0 && previewSize.height > 0) {
        const contentW = previewSize.width * zoom;
        const contentH = previewSize.height * zoom;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const minVisible = Math.min(100, cw * 0.15, ch * 0.15);
        const wrapperLeft = (cw - contentW) / 2;
        const wrapperTop = (ch - contentH) / 2;

        const maxPanX = cw - minVisible - wrapperLeft;
        const minPanX = minVisible - wrapperLeft - contentW;
        const maxPanY = ch - minVisible - wrapperTop;
        const minPanY = minVisible - wrapperTop - contentH;

        newPanX = Math.max(minPanX, Math.min(maxPanX, newPanX));
        newPanY = Math.max(minPanY, Math.min(maxPanY, newPanY));
      }

      setPanOffsetX(newPanX);
      setPanOffsetY(newPanY);
    },
    [isCanvasPanning, previewSize.width, previewSize.height, zoom],
  );

  const stopCanvasPanning = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (canvasPanPointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // pointer capture may already be released
    }
    canvasPanStartRef.current = null;
    canvasPanPointerIdRef.current = null;
    setIsCanvasPanning(false);
    window.setTimeout(() => {
      ignoreNextMouseUpRef.current = false;
    }, 0);
  }, []);

  const previewGridSize = Math.max(12, Math.round(24 * zoom));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
      {/* Top bar */}
      <header className="relative z-10 h-[60px] flex-shrink-0 bg-white after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gray-200 after:content-[''] dark:bg-gray-800 dark:after:bg-gray-700">
        <div className="mx-auto flex h-full w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <LogoIcon asBrand onClick={() => navigate('/')} />
            <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">|</span>
            <h1 className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {data.resume.name}
            </h1>

          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NavbarAuth hideUsernameOnMobile />
          </div>
        </div>
      </header>

      {/* Preview area */}
      <div ref={canvasViewportRef} className="flex-1 min-h-0 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
        <style>{`
          #share-preview-container[data-canvas-move-active="true"],
          #share-preview-container[data-canvas-move-active="true"] * {
            cursor: grab !important;
          }
          #share-preview-container[data-canvas-panning="true"],
          #share-preview-container[data-canvas-panning="true"] * {
            cursor: grabbing !important;
            user-select: none !important;
          }
        `}</style>

        <div
          ref={scrollContainerRef}
          id="share-preview-container"
          className={isMobile
            ? 'theme-transition-stable absolute inset-0 overflow-auto px-3 pt-4 pb-0 hide-scrollbar'
            : 'theme-transition-stable absolute inset-0 overflow-auto pt-6 pb-0 px-8 hide-scrollbar'}
          data-canvas-move-active={canvasMoveActive ? 'true' : undefined}
          data-canvas-panning={isCanvasPanning ? 'true' : undefined}
          style={{
            overflow: canvasMoveActive ? 'hidden' : 'auto',
            backgroundColor: 'var(--canvas-bg)',
            backgroundImage: `
              linear-gradient(var(--canvas-grid) 1px, transparent 1px),
              linear-gradient(90deg, var(--canvas-grid) 1px, transparent 1px)
            `,
            backgroundSize: `${previewGridSize}px ${previewGridSize}px`,
            backgroundPosition: 'center top',
            transition: 'background-size 0.15s ease-out',
            touchAction: canvasMoveActive ? 'none' : 'auto',
          }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={stopCanvasPanning}
          onPointerCancel={stopCanvasPanning}
        >
          <div
            id="share-preview-scale-wrapper"
            className="relative mx-auto"
            style={{
              transform: panOffsetX !== 0 || panOffsetY !== 0
                ? `translate(${panOffsetX}px, ${panOffsetY}px)`
                : undefined,
              width: previewSize.width ? `${previewSize.width * zoom}px` : 'max-content',
              height: previewSize.height ? `${previewSize.height * zoom + bottomGap}px` : 'auto',
              transition: canvasMoveActive ? 'none' : 'width 0.15s ease-out, height 0.15s ease-out',
              maxWidth: previewSize.width ? 'none' : `${100 / zoom}%`,
              pointerEvents: canvasMoveActive ? 'none' : 'auto',
            }}
          >
            <div
              id="share-preview-scaled-content"
              ref={setPreviewContentRef}
              className="theme-transition-stable"
              style={{
                position: previewSize.width ? 'absolute' : 'relative',
                top: 0,
                left: 0,
                transform: previewSize.width
                  ? `translateX(${(previewSize.width * (zoom - 1)) / 2}px) scale(${zoom})`
                  : `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
                width: 'max-content',
                maxWidth: previewSize.width ? 'none' : `${100 / zoom}%`,
              }}
            >
              <ResumePreview viewportWidth={viewportWidth} zoom={zoom} />
            </div>
          </div>
        </div>

        {/* Share canvas toolbar */}
        <div className="no-print fixed bottom-0 left-0 right-0 z-20 pointer-events-none"
          style={{ height: isMobile ? '88px' : '56px' }}
        />
        <CanvasFloatingToolbar
          viewportRef={canvasViewportRef}
          mobile={isMobile}
          mobileCollapsed={mobileToolbarCollapsed}
          onMobileCollapsedChange={setMobileToolbarCollapsed}
          storageKey="resume_share_toolbar_dock"
          forceBottomOnMobile
        >
          {(helpers) => (
            <>
              {/* 移动画布 */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleToggleCanvasMove();
                }}
                className={helpers.buttonClass(canvasMoveActive, !isMobile, true)}
                aria-label={t('editor:previewToolbar.moveCanvas')}
                aria-pressed={canvasMoveActive}
              >
                <Hand className="h-4 w-4" />
                {!isMobile && !helpers.isVertical && <span className="text-xs leading-none">{t('editor:previewToolbar.moveCanvas')}</span>}
              </button>

              <div className={helpers.dividerClass} />

              {/* 缩小 */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleZoomOut}
                disabled={zoom <= MIN_PREVIEW_ZOOM}
                className={helpers.buttonClass(false)}
                aria-label={t('editor:previewToolbar.zoomOut')}
              >
                <Minus className="h-4 w-4" />
              </button>

              {/* 缩放比例 */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleResetZoom}
                className={helpers.buttonClass(false, true)}
                aria-label={t('editor:previewToolbar.resetZoom')}
                aria-pressed={isZoomReset}
              >
                <span className="tabular-nums text-[11px] leading-none">
                  {Math.round(zoom * 100)}%
                </span>
              </button>

              {/* 放大 */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleZoomIn}
                disabled={zoom >= MAX_PREVIEW_ZOOM}
                className={helpers.buttonClass(false)}
                aria-label={t('editor:previewToolbar.zoomIn')}
              >
                <Plus className="h-4 w-4" />
              </button>

              <div className={helpers.dividerClass} />

              {/* 适应页面 */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleFitToWidth}
                className={helpers.buttonClass(false, !isMobile, true)}
                aria-label={t('editor:previewToolbar.fitPage')}
              >
                <Maximize2 className="h-4 w-4" />
                {!isMobile && !helpers.isVertical && <span className="text-xs leading-none">{t('editor:previewToolbar.fitPage')}</span>}
              </button>

              <div className={helpers.dividerClass} />

              {/* 导出 / 下载 */}
              <div className="relative inline-flex">
                {data.can_export ? (
                  <button
                    ref={exportBtnRef}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={isExporting}
                    className={helpers.buttonClass(false, !isMobile, true)}
                    aria-label={t('share.exportResume')}
                    aria-expanded={showExportMenu}
                    aria-haspopup="true"
                  >
                    {isExporting ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {!isMobile && !helpers.isVertical && <span className="text-xs leading-none">{t('common:export')}</span>}
                  </button>
                ) : (
                  <Tooltip content={t('share.exportDisabledTooltip')}>
                  <button
                    type="button"
                    disabled
                    className={helpers.buttonClass(false, !isMobile, true) + ' opacity-50 cursor-not-allowed'}
                    aria-label={t('share.exportDisabled')}
                  >
                    <Download className="h-4 w-4" />
                    {!isMobile && !helpers.isVertical && <span className="text-xs leading-none">{t('common:export')}</span>}
                  </button>
                  </Tooltip>
                )}

                {showExportMenu && (
                  <div
                    ref={exportMenuRef}
                    className={[
                      'absolute bottom-full mb-2 right-0',
                      'bg-white border border-gray-200 rounded-[14px] shadow-[0_10px_28px_rgba(15,23,42,0.10)] p-1.5 z-50 min-w-[188px] dark:bg-slate-950 dark:border-slate-800',
                    ].join(' ')}
                    style={{ animation: 'dropdown-appear 0.15s ease-out' }}
                  >
                    <style>{`
                      @keyframes dropdown-appear {
                        from { opacity: 0; transform: translateY(4px); }
                        to { opacity: 1; transform: translateY(0); }
                      }
                    `}</style>
                    <button onClick={() => handleExportOption('pdf')} className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]">
                      <FileText className="w-4 h-4 text-red-400 transition-colors group-hover/menu:text-red-500 dark:group-hover/menu:text-red-300" />
                      <div className="text-left"><div className="font-medium">{t('editor:exportPDF')}</div></div>
                    </button>
                    <button onClick={() => handleExportOption('png')} className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]">
                      <Image className="w-4 h-4 text-purple-400 transition-colors group-hover/menu:text-purple-500 dark:group-hover/menu:text-purple-300" />
                      <div className="text-left"><div className="font-medium">{t('editor:exportPNG')}</div></div>
                    </button>
                    <button onClick={() => handleExportOption('md')} className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]">
                      <FileCode2 className="w-4 h-4 text-green-500 transition-colors group-hover/menu:text-green-600 dark:group-hover/menu:text-green-300" />
                      <div className="text-left"><div className="font-medium">{t('editor:exportMarkdown')}</div></div>
                    </button>
                    <button onClick={() => handleExportOption('json')} className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]">
                      <FileJson className="w-4 h-4 text-amber-500 transition-colors group-hover/menu:text-amber-600 dark:group-hover/menu:text-amber-300" />
                      <div className="text-left"><div className="font-medium">{t('editor:exportJSON')}</div></div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </CanvasFloatingToolbar>
      </div>

      <ExportProgressDock progress={pdfExportProgress ?? pngExportProgress} />

    </div>
  );
}
