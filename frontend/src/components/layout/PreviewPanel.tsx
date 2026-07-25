import React, { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Hand, Loader2, Maximize2, Minus, Plus, Redo2, SearchCheck, Sparkles, Undo2 } from 'lucide-react';
import { ResumePreview } from '../preview/PreviewComponents';
import { FloatingToolbar } from '../preview/FloatingToolbar';
import { CanvasFloatingToolbar, type CanvasToolbarActions } from '../preview/CanvasFloatingToolbar';
import { useAppUI, useHistory } from '../../context/ResumeContext';
import { useDiagnosisContext } from '../../context/DiagnosisContext';
import { useTextSelection } from '../../hooks/useTextSelection';
import { MAX_PREVIEW_ZOOM, MIN_PREVIEW_ZOOM } from '../../utils/previewZoom';


import { DiagnosisSuggestionLayer } from './preview-panel/DiagnosisSuggestionLayer';
import { DiagnosisProgressDock } from './preview-panel/DiagnosisProgressDock';
import { useCanvasViewport } from './preview-panel/useCanvasViewport';

interface PreviewPanelProps {
  previewRef: React.RefObject<HTMLDivElement>;
  resumeId?: string;
  isExporting: boolean;
  isExportingPNG: boolean;
  isExportingMD: boolean;
  isExportingJSON: boolean;
  onExportPDF: () => void;
  onExportPNG: () => void;
  onExportMD: () => void;
  onExportJSON: () => void;
  onPageCountChange?: (numPages: number) => void;
  canvasToolbar: CanvasToolbarActions;
  isMobile?: boolean;
  isActive?: boolean;
}

export function PreviewPanel({ previewRef, onPageCountChange, canvasToolbar, isMobile = false, isActive = true }: PreviewPanelProps) {
  const { ui, uiDispatch } = useAppUI();
  const { t } = useTranslation('editor');
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const bottomGap = isMobile ? 96 : 48;
  const previewGridSize = Math.max(12, Math.round(24 * ui.zoom));

  // 全局撤销 / 重做（用于快捷键）
  const { undo, redo } = useHistory();
  const diagnosis = useDiagnosisContext();
  const handleUndo = useCallback(() => {
    if (diagnosis.undoLastAction()) return;
    undo();
  }, [diagnosis, undo]);


  // 文本选中 & 悬浮工具栏
  const {
    selection,
    showToolbar,
    handleMouseUp,
    handleToggleBold,
    handleToggleItalic,
    handleToggleUnderline,
    handleClearFormat,
    handleToggleOrderedList,
    handleToggleUnorderedList,
    closeToolbar,
    handleMouseLeave,
  } = useTextSelection(scrollContainerRef as React.RefObject<HTMLElement | null>);

  // 全局快捷键 Ctrl+Z / Ctrl+Y / Ctrl+B / Ctrl+I / Ctrl+U（抽屉关闭时生效）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (ui.drawerOpen) return; // 抽屉打开时，由抽屉内部处理

      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redo();
        } else if (!isInputFocused) {
          // 文本格式化快捷键：仅在非输入框环境下生效
          // handleToggleBold/I/U 内部会自行检查 selection 是否存在
          if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            handleToggleBold();
          } else if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            handleToggleItalic();
          } else if (e.key === 'u' || e.key === 'U') {
            e.preventDefault();
            handleToggleUnderline();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, redo, ui.drawerOpen, handleToggleBold, handleToggleItalic, handleToggleUnderline]);

  const setZoom = useCallback((newZoom: number) => {
    uiDispatch({ type: 'SET_ZOOM', payload: newZoom });
  }, [uiDispatch]);

  const {
    previewSize,
    viewportWidth,
    canvasMoveActive,
    isCanvasPanning,
    panOffsetX,
    panOffsetY,
    mobileToolbarCollapsed,
    setMobileToolbarCollapsed,
    setPreviewContentRef,
    resetPanOffset,
    handleFitToWidth,
    handleToggleCanvasMove,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    stopCanvasPanning,
    handlePreviewMouseUp,
  } = useCanvasViewport({
    previewRef,
    previewContentRef,
    scrollContainerRef,
    zoom: ui.zoom,
    setZoom,
    isMobile,
    isActive,
    closeToolbar,
    handleMouseUp,
  });

  return (
    <div className="theme-transition-target h-full flex flex-col bg-gray-100">
      {/* Preview Area */}
      <div
        ref={canvasViewportRef}
        className="flex-1 min-h-0 relative overflow-hidden bg-gray-100"
      >
        <style>{`
          #preview-container[data-canvas-move-active="true"],
          #preview-container[data-canvas-move-active="true"] * {
            cursor: grab !important;
          }
          #preview-container[data-canvas-panning="true"],
          #preview-container[data-canvas-panning="true"] * {
            cursor: grabbing !important;
            user-select: none !important;
          }
        `}</style>
        <div
          ref={scrollContainerRef}
          id="preview-container"
          className={isMobile
            ? 'theme-transition-stable absolute inset-0 px-3 pt-4 pb-0 hide-scrollbar'
            : 'theme-transition-stable absolute inset-0 pt-6 pb-0 px-8 hide-scrollbar'}
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
        onMouseUp={handlePreviewMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          id="preview-scale-wrapper"
          className="relative mx-auto"
          style={{
            transform: panOffsetX !== 0 || panOffsetY !== 0
              ? `translate(${panOffsetX}px, ${panOffsetY}px)`
              : undefined,
            width: previewSize.width ? `${previewSize.width * ui.zoom}px` : 'max-content',
            height: previewSize.height ? `${previewSize.height * ui.zoom + bottomGap}px` : 'auto',
            transition: canvasMoveActive ? 'none' : 'width 0.15s ease-out, height 0.15s ease-out',
            maxWidth: previewSize.width ? 'none' : `${100 / ui.zoom}%`,
            pointerEvents: canvasMoveActive ? 'none' : 'auto',
          }}
        >
          <div
            id="preview-scaled-content"
            ref={setPreviewContentRef}
            className="theme-transition-stable"
            style={{
              position: previewSize.width ? 'absolute' : 'relative',
              top: 0,
              left: 0,
              transform: previewSize.width
                ? `translateX(${(previewSize.width * (ui.zoom - 1)) / 2}px) scale(${ui.zoom})`
                : `scale(${ui.zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
              width: 'max-content',
              maxWidth: previewSize.width ? 'none' : `${100 / ui.zoom}%`,
            }}
          >
            <ResumePreview viewportWidth={viewportWidth} zoom={ui.zoom} onPageCountChange={onPageCountChange} />
          </div>
        </div>

        {/* 悬浮格式工具栏 */}
        {showToolbar && selection && (
          <FloatingToolbar
            selection={selection}
            containerRef={scrollContainerRef as React.RefObject<HTMLElement | null>}
            onToggleBold={handleToggleBold}
            onToggleItalic={handleToggleItalic}
            onToggleUnderline={handleToggleUnderline}
            onToggleOrderedList={handleToggleOrderedList}
            onToggleUnorderedList={handleToggleUnorderedList}
            onClearFormat={handleClearFormat}
            onClose={closeToolbar}
          />
        )}
        <DiagnosisSuggestionLayer
          mobile={isMobile}
          containerRef={scrollContainerRef as React.RefObject<HTMLElement | null>}
          scale={ui.zoom}
        />
        </div>

        <CanvasFloatingToolbar
          viewportRef={canvasViewportRef}
          mobile={isMobile}
          mobileCollapsed={mobileToolbarCollapsed}
          onMobileCollapsedChange={setMobileToolbarCollapsed}
        >
          {(helpers) => {
            const isZoomReset = Math.abs(canvasToolbar.zoom - 1) < 0.005;
            return (
              <>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    handleToggleCanvasMove();
                  }}
                  className={helpers.buttonClass(canvasMoveActive, true, true)}
                  aria-label={t('previewToolbar.moveCanvas')}
                  aria-pressed={canvasMoveActive}
                >
                  <Hand className="h-4 w-4" />
                  {!helpers.isCompactHorizontal && !helpers.isVertical && (
                    <span className="text-xs leading-none">{t('previewToolbar.moveCanvas')}</span>
                  )}
                </button>

                <div className={helpers.dividerClass} />

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={canvasToolbar.onUndo}
                  disabled={!canvasToolbar.canUndo}
                  className={helpers.buttonClass(false)}
                  aria-label={t('previewToolbar.undo')}
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={canvasToolbar.onRedo}
                  disabled={!canvasToolbar.canRedo}
                  className={helpers.buttonClass(false)}
                  aria-label={t('previewToolbar.redo')}
                >
                  <Redo2 className="h-4 w-4" />
                </button>

                <div className={helpers.dividerClass} />

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={canvasToolbar.onZoomOut}
                  disabled={canvasToolbar.zoom <= MIN_PREVIEW_ZOOM}
                  className={helpers.buttonClass(false)}
                  aria-label={t('previewToolbar.zoomOut')}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    resetPanOffset();
                    canvasToolbar.onResetZoom();
                  }}
                  className={helpers.buttonClass(false, true)}
                  aria-label={t('previewToolbar.resetZoom')}
                  aria-pressed={isZoomReset}
                >
                  <span className="tabular-nums text-[11px] leading-none">
                    {Math.round(canvasToolbar.zoom * 100)}%
                  </span>
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={canvasToolbar.onZoomIn}
                  disabled={canvasToolbar.zoom >= MAX_PREVIEW_ZOOM}
                  className={helpers.buttonClass(false)}
                  aria-label={t('previewToolbar.zoomIn')}
                >
                  <Plus className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleFitToWidth}
                  className={helpers.buttonClass(false, true, true)}
                  aria-label={t('previewToolbar.fitWidth')}
                >
                  <Maximize2 className="h-4 w-4" />
                  {!helpers.isCompactHorizontal && !helpers.isVertical && (
                    <span className="text-xs leading-none">{t('previewToolbar.fitPage')}</span>
                  )}
                </button>

                <div className={helpers.dividerClass} />

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={canvasToolbar.onToggleAutoFit}
                  className={helpers.buttonClass(canvasToolbar.autoFitActive, true, true)}
                  aria-label={t('previewToolbar.smartOnePage')}
                  aria-pressed={canvasToolbar.autoFitActive}
                >
                  {canvasToolbar.isAutoFitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {!helpers.isCompactHorizontal && !helpers.isVertical && (
                    <span className="text-xs leading-none">{t('previewToolbar.smartOnePage')}</span>
                  )}
                </button>

                <div className={helpers.dividerClass} />

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    void canvasToolbar.onRunAiCheck();
                  }}
                  disabled={canvasToolbar.aiLoading || (canvasToolbar.activeAiTask !== null && canvasToolbar.activeAiTask !== 'diagnosis')}
                  className={`${helpers.buttonClass(canvasToolbar.aiHasResults, true, true)} relative`}
                  aria-label={t('previewToolbar.aiDiagnosis')}
                  aria-pressed={canvasToolbar.aiHasResults}
                >
                  {canvasToolbar.aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  ) : (
                    <Sparkles className="h-4 w-4 flex-shrink-0" />
                  )}
                  {!helpers.isCompactHorizontal && !helpers.isVertical && (
                    <span className="text-xs leading-none">{t('previewToolbar.aiDiagnosis')}</span>
                  )}
                </button>

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={canvasToolbar.onOpenAts}
                  disabled={canvasToolbar.atsLoading || (canvasToolbar.activeAiTask !== null && canvasToolbar.activeAiTask !== 'ats')}
                  className={`${helpers.buttonClass(canvasToolbar.atsHasResults, true, true)} relative`}
                  aria-label={t('previewToolbar.atsCheck')}
                  aria-pressed={canvasToolbar.atsHasResults}
                >
                  {canvasToolbar.atsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  ) : (
                    <SearchCheck className="h-4 w-4 flex-shrink-0" />
                  )}
                  {!helpers.isCompactHorizontal && !helpers.isVertical && (
                    <span className="text-xs leading-none">{t('previewToolbar.atsCheck')}</span>
                  )}
                </button>
              </>
            );
          }}
        </CanvasFloatingToolbar>
        <DiagnosisProgressDock mobile={isMobile} />
      </div>

    </div>
  );
}
