import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Hand,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  SearchCheck,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { ResumePreview } from '../preview/PreviewComponents';
import { FloatingToolbar } from '../preview/FloatingToolbar';
import { CanvasFloatingToolbar, type CanvasToolbarActions } from '../preview/CanvasFloatingToolbar';
import { useAppUI, useHistory } from '../../context/ResumeContext';
import { useDiagnosisContext } from '../../context/DiagnosisContext';
import { useTextSelection } from '../../hooks/useTextSelection';
import { AISuggestionBubble } from '../common/AISuggestionBubble';
import { TaskProgressDock } from '../common/TaskProgressDock';
import {
  calculateFitPreviewZoom,
  MAX_PREVIEW_ZOOM,
  MIN_PREVIEW_ZOOM,
  previewZoomFromWheel,
} from '../../utils/previewZoom';

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

interface CanvasPanStart {
  pointerX: number;
  pointerY: number;
  panOffsetX: number;
  panOffsetY: number;
}

interface FloatingPosition {
  top: number;
  left: number;
  width: number;
  itemId?: string;
  arrowLeft?: number;
  /** Where the arrow points relative to the bubble: 'up' = arrow on top edge, 'down' = arrow on bottom edge */
  arrowEdge?: 'top' | 'bottom';
}

const DIAGNOSIS_ISSUE_LABEL_KEYS: Record<string, string> = {
  overclaim: 'diagnosisPanel.issueType.overclaim',
  vague: 'diagnosisPanel.issueType.vague',
  no_metric: 'diagnosisPanel.issueType.noMetric',
  empty_word: 'diagnosisPanel.issueType.emptyWord',
  weak: 'diagnosisPanel.issueType.weak',
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

type SuggestionAnchorTarget = HTMLElement | Range;

function getSuggestionAnchorRect(target: SuggestionAnchorTarget): DOMRect | null {
  const rects = Array.from(target.getClientRects())
    .filter((rect) => rect.width > 0 && rect.height > 0);

  if (rects.length > 0) return rects[0];

  const fallback = target.getBoundingClientRect();
  return fallback.width > 0 && fallback.height > 0 ? fallback : null;
}

function getVisibleIntersectionArea(rect: DOMRect, bounds?: DOMRect) {
  const visibleLeft = Math.max(rect.left, bounds?.left ?? 0, 0);
  const visibleTop = Math.max(rect.top, bounds?.top ?? 0, 0);
  const visibleRight = Math.min(rect.right, bounds?.right ?? window.innerWidth, window.innerWidth);
  const visibleBottom = Math.min(rect.bottom, bounds?.bottom ?? window.innerHeight, window.innerHeight);
  return Math.max(0, visibleRight - visibleLeft) * Math.max(0, visibleBottom - visibleTop);
}

function getVisibleDiagnosisMark(id: string): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-diagnosis-id]'))
    .filter((el) => el.dataset.diagnosisId === id);

  let best: { el: HTMLElement; rect: DOMRect } | null = null;
  for (const el of candidates) {
    const rect = getSuggestionAnchorRect(el);
    if (!rect) continue;

    const paper = el.closest<HTMLElement>('.resume-paper');
    const paperRect = paper?.getBoundingClientRect();
    if (getVisibleIntersectionArea(rect, paperRect) <= 0) continue;

    if (
      !best ||
      rect.top < best.rect.top - 0.5 ||
      (Math.abs(rect.top - best.rect.top) <= 0.5 && rect.left < best.rect.left)
    ) {
      best = { el, rect };
    }
  }

  return best?.el ?? null;
}

function pointInExpandedRect(x: number, y: number, rect: DOMRect, padding: number) {
  return (
    x >= rect.left - padding &&
    x <= rect.right + padding &&
    y >= rect.top - padding &&
    y <= rect.bottom + padding
  );
}

function pointInBridgeRect(x: number, y: number, first: DOMRect, second: DOMRect, padding: number) {
  const left = first.right < second.left
    ? first.right - padding
    : second.right < first.left
      ? second.right - padding
      : Math.max(first.left, second.left) - padding;
  const right = first.right < second.left
    ? second.left + padding
    : second.right < first.left
      ? first.left + padding
      : Math.min(first.right, second.right) + padding;
  const top = first.bottom < second.top
    ? first.bottom - padding
    : second.bottom < first.top
      ? second.bottom - padding
      : Math.max(first.top, second.top) - padding;
  const bottom = first.bottom < second.top
    ? second.top + padding
    : second.bottom < first.top
      ? first.top + padding
      : Math.min(first.bottom, second.bottom) + padding;

  return x >= left && x <= right && y >= top && y <= bottom;
}

function getDiagnosisMarkAtPoint(x: number, y: number): HTMLElement | null {
  for (const element of document.elementsFromPoint(x, y)) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.closest('[data-long-text-editor-panel], [data-confirm-modal]')) return null;
    if (element.closest('[data-diagnosis-popover]')) return null;
    const mark = element.closest<HTMLElement>('[data-diagnosis-id]');
    if (mark?.dataset.diagnosisId) return mark;
  }

  return null;
}

function shouldSuppressDiagnosisHover() {
  return Boolean(document.querySelector('[data-long-text-editor-panel], [data-confirm-modal]'));
}

function hasActiveTextSelection() {
  const selection = window.getSelection();
  return !!selection && !selection.isCollapsed && selection.toString().trim().length > 0;
}

function computeFloatingPosition(anchor: HTMLElement, popover: HTMLElement | null): FloatingPosition {
  const firstLineRect = getSuggestionAnchorRect(anchor) ?? anchor.getBoundingClientRect();
  const paperRect = anchor.closest<HTMLElement>('.resume-paper')?.getBoundingClientRect();
  let bounds = {
    left: Math.max(8, paperRect?.left ?? 8),
    top: Math.max(8, paperRect?.top ?? 8),
    right: Math.min(window.innerWidth - 8, paperRect?.right ?? window.innerWidth - 8),
    bottom: Math.min(window.innerHeight - 8, paperRect?.bottom ?? window.innerHeight - 8),
  };

  if (bounds.right - bounds.left < 280 || bounds.bottom - bounds.top < 180) {
    bounds = {
      left: 8,
      top: 8,
      right: window.innerWidth - 8,
      bottom: window.innerHeight - 8,
    };
  }

  const verticalGap = 18;
  const width = Math.min(320, Math.max(260, bounds.right - bounds.left - 16));
  const height = popover?.offsetHeight || 160;
  // Anchor to the beginning of the first rendered text line, not the paragraph/list item box.
  const anchorX = firstLineRect.left;
  const anchorY = firstLineRect.top;

  function arrowFromAnchor(bubbleLeft: number, bubbleWidth: number, arrowEdge: 'top' | 'bottom') {
    const rawArrowLeft = anchorX - bubbleLeft + 12;
    return {
      arrowLeft: clamp(rawArrowLeft, 20, bubbleWidth - 20),
      arrowEdge,
    };
  }

  // Prefer above, left-aligned to the first-line text start.
  const aboveTop = anchorY - height - verticalGap;
  if (aboveTop >= bounds.top) {
    const bubbleLeft = clamp(anchorX, bounds.left, bounds.right - width);
    const { arrowLeft, arrowEdge } = arrowFromAnchor(bubbleLeft, width, 'bottom');
    return {
      left: bubbleLeft,
      top: aboveTop,
      width,
      arrowLeft,
      arrowEdge,
    };
  }

  // Below, left-aligned to the first-line text start.
  const belowTop = anchorY + firstLineRect.height + verticalGap;
  if (belowTop + height <= bounds.bottom) {
    const bubbleLeft = clamp(anchorX, bounds.left, bounds.right - width);
    const { arrowLeft, arrowEdge } = arrowFromAnchor(bubbleLeft, width, 'top');
    return {
      left: bubbleLeft,
      top: belowTop,
      width,
      arrowLeft,
      arrowEdge,
    };
  }

  // If the bubble cannot fully fit above or below, clamp only the overflowing axis.
  const availableAbove = Math.max(0, anchorY - bounds.top - verticalGap);
  const availableBelow = Math.max(0, bounds.bottom - (anchorY + firstLineRect.height) - verticalGap);
  const fallbackTop = availableAbove >= availableBelow
    ? Math.min(bounds.bottom - height, anchorY - height - verticalGap)
    : Math.max(bounds.top, anchorY + firstLineRect.height + verticalGap);

  const bubbleLeft = clamp(anchorX, bounds.left, bounds.right - width);
  const arrowEdge = fallbackTop <= anchorY ? 'bottom' : 'top';
  const { arrowLeft } = arrowFromAnchor(bubbleLeft, width, arrowEdge);
  return {
    left: bubbleLeft,
    top: clamp(fallbackTop, bounds.top, bounds.bottom - height),
    width,
    arrowLeft,
    arrowEdge,
  };
}

function DiagnosisSuggestionLayer({
  mobile,
  containerRef,
  scale,
}: {
  mobile: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  scale: number;
}) {
  const { t } = useTranslation('editor');
  const diagnosis = useDiagnosisContext();
  const popoverRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverOpenTimerRef = useRef<number | null>(null);
  const pendingHoverItemIdRef = useRef<string | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const [hoverItemId, setHoverItemId] = useState<string | null>(null);

  const stickyItem = diagnosis.items.find((item) => item.id === diagnosis.activeItemId) ?? null;
  const hoverItem = diagnosis.items.find((item) => item.id === hoverItemId) ?? null;
  const activeItem = mobile ? stickyItem : stickyItem ?? hoverItem;
  const labels = {
    title: t('diagnosisPanel.popover.title'),
    original: t('diagnosisPanel.popover.original'),
    replacement: t('diagnosisPanel.popover.replacement'),
    noReplacement: t('diagnosisPanel.popover.noReplacement'),
    ignore: t('diagnosisPanel.popover.ignore'),
    replace: t('diagnosisPanel.popover.replace'),
  };

  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimerRef.current !== null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const cancelHoverOpen = useCallback(() => {
    if (hoverOpenTimerRef.current !== null) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    pendingHoverItemIdRef.current = null;
  }, []);

  const scheduleHoverOpen = useCallback((id: string) => {
    cancelHoverClose();
    if (hoverItemId === id) return;
    if (pendingHoverItemIdRef.current === id && hoverOpenTimerRef.current !== null) return;

    cancelHoverOpen();
    pendingHoverItemIdRef.current = id;
    hoverOpenTimerRef.current = window.setTimeout(() => {
      if (hasActiveTextSelection()) {
        pendingHoverItemIdRef.current = null;
        hoverOpenTimerRef.current = null;
        return;
      }
      setHoverItemId(id);
      pendingHoverItemIdRef.current = null;
      hoverOpenTimerRef.current = null;
    }, 220);
  }, [cancelHoverClose, cancelHoverOpen, hoverItemId]);

  const scheduleHoverClose = useCallback((id: string | null = hoverItemId) => {
    if (!id) return;
    cancelHoverOpen();
    if (hoverCloseTimerRef.current !== null) return;
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setHoverItemId((current) => (current === id ? null : current));
      hoverCloseTimerRef.current = null;
    }, 220);
  }, [cancelHoverOpen, hoverItemId]);

  const updatePosition = useCallback(() => {
    if (mobile || !activeItem) {
      setPosition(null);
      return;
    }

    const anchor = getVisibleDiagnosisMark(activeItem.id);
    if (!anchor) {
      setPosition(null);
      return;
    }
    setPosition({
      ...computeFloatingPosition(anchor, popoverRef.current),
      itemId: activeItem.id,
    });
  }, [activeItem, mobile]);

  useEffect(() => {
    if (mobile) {
      setHoverItemId(null);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (shouldSuppressDiagnosisHover()) {
        cancelHoverOpen();
        if (hoverItemId) setHoverItemId(null);
        if (stickyItem) diagnosis.setActiveItem(null);
        return;
      }

      if (event.buttons !== 0 || hasActiveTextSelection()) {
        cancelHoverOpen();
        return;
      }

      if (stickyItem) {
        cancelHoverOpen();
        return;
      }

      const x = event.clientX;
      const y = event.clientY;
      const cardRect = cardRef.current?.getBoundingClientRect();
      const anchorRect = hoverItemId ? getVisibleDiagnosisMark(hoverItemId)?.getBoundingClientRect() : null;
      const overCard = cardRect ? pointInExpandedRect(x, y, cardRect, 8) : false;
      const overAnchor = anchorRect ? pointInExpandedRect(x, y, anchorRect, 8) : false;
      const overBridge = cardRect && anchorRect ? pointInBridgeRect(x, y, anchorRect, cardRect, 18) : false;

      if (overCard) {
        cancelHoverClose();
        return;
      }

      const mark = getDiagnosisMarkAtPoint(x, y);
      const id = mark?.dataset.diagnosisId;
      if (id) {
        if (!hoverItemId || id === hoverItemId || (!overAnchor && !overBridge)) {
          scheduleHoverOpen(id);
          return;
        }

        cancelHoverClose();
        return;
      }

      if (overAnchor || overBridge) {
        cancelHoverClose();
        return;
      }

      cancelHoverOpen();
      scheduleHoverClose(hoverItemId);
    };

    document.addEventListener('pointermove', handlePointerMove);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      if (hoverCloseTimerRef.current !== null) {
        window.clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      cancelHoverOpen();
    };
  }, [cancelHoverClose, cancelHoverOpen, diagnosis, hoverItemId, mobile, scheduleHoverClose, scheduleHoverOpen, stickyItem]);

  useLayoutEffect(() => {
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    const transitionTimer = window.setTimeout(updatePosition, 180);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(transitionTimer);
    };
  }, [updatePosition, activeItem?.replacement, activeItem?.original_text, scale]);

  useEffect(() => {
    if (!activeItem || mobile) return;
    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    const container = containerRef.current;
    container?.addEventListener('scroll', handleReposition);
    const anchor = getVisibleDiagnosisMark(activeItem.id);
    const paper = anchor?.closest<HTMLElement>('.resume-paper') ?? undefined;
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(handleReposition)
      : null;
    if (resizeObserver) {
      if (anchor) resizeObserver.observe(anchor);
      if (paper) resizeObserver.observe(paper);
      if (popoverRef.current) resizeObserver.observe(popoverRef.current);
    }
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      container?.removeEventListener('scroll', handleReposition);
      resizeObserver?.disconnect();
    };
  }, [activeItem, containerRef, mobile, scale, updatePosition]);

  useEffect(() => {
    if (!stickyItem) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (cardRef.current?.contains(target)) return;
      if (target.closest('[data-diagnosis-id]')) return;
      diagnosis.setActiveItem(null);
      setHoverItemId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        diagnosis.setActiveItem(null);
        setHoverItemId(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [diagnosis, stickyItem]);

  if (!activeItem) return null;

  const issueType = activeItem.issue_type || 'weak';
  const issueLabel = DIAGNOSIS_ISSUE_LABEL_KEYS[issueType]
    ? t(DIAGNOSIS_ISSUE_LABEL_KEYS[issueType])
    : issueType;

  const bubbleNode = (
    <AISuggestionBubble
      ref={cardRef}
      visible
      title={labels.title}
      issueLabel={issueLabel}
      description={activeItem.suggestion}
      suggestion={activeItem.replacement || undefined}
      ignoreLabel={labels.ignore}
      applyLabel={labels.replace}
      disabled={!activeItem.replacement}
      className={`diagnosis-suggestion-bubble ${position?.arrowEdge === 'top' ? 'ai-bubble-arrow-edge-top' : 'ai-bubble-arrow-edge-bottom'}`}
      onIgnore={() => diagnosis.ignoreItem(activeItem.id)}
      onApply={() => diagnosis.optimizeItem(activeItem.id)}
      onPointerEnter={() => {
        if (!stickyItem) cancelHoverClose();
      }}
      onPointerLeave={(event) => {
        if (stickyItem) return;
        const related = event.relatedTarget as HTMLElement | null;
        if (related?.closest('[data-diagnosis-id]')) return;
        scheduleHoverClose(activeItem.id);
      }}
      onClick={(event) => event.stopPropagation()}
    />
  );

  if (mobile) {
    return createPortal(
      <div
        className="no-print fixed inset-0 z-[10020] bg-black/30"
        data-export-exclude="diagnosis-bottom-sheet"
        onClick={() => diagnosis.setActiveItem(null)}
      >
        <div
          className="theme-transition-target absolute inset-x-0 bottom-0 max-h-[72vh] overflow-y-auto rounded-t-2xl border-t border-gray-100 bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-18px_44px_rgba(15,23,42,0.18)] dark:border-[color:var(--border-soft)] dark:bg-[color:var(--bg-panel)] dark:shadow-[0_-18px_44px_rgba(23,25,29,0.7)]"
          onClick={(event) => event.stopPropagation()}
        >
          {bubbleNode}
        </div>
      </div>,
      document.body,
    );
  }

  const isPositionReady = position?.itemId === activeItem.id;

  return createPortal(
    <div
      ref={popoverRef}
      className="no-print pointer-events-auto fixed z-[10020]"
      style={{
        top: isPositionReady ? position.top : 0,
        left: isPositionReady ? position.left : 0,
        width: position?.width ?? 280,
        visibility: isPositionReady ? 'visible' : 'hidden',
        pointerEvents: isPositionReady ? 'auto' : 'none',
        ...(position?.arrowLeft !== undefined ? { '--arrow-left': `${position.arrowLeft}px` } as React.CSSProperties : {}),
      }}
      data-diagnosis-popover="true"
      data-export-exclude="diagnosis-popover"
    >
      {bubbleNode}
    </div>,
    document.body,
  );
}

function DiagnosisProgressDock({ mobile = false }: { mobile?: boolean }) {
  const { t } = useTranslation('editor');
  const diagnosis = useDiagnosisContext();
  const [visibleState, setVisibleState] = useState<'loading' | 'success' | 'error' | null>(
    diagnosis.loading ? 'loading' : null,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const previousLoadingRef = useRef(diagnosis.loading);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (diagnosis.loading) {
      setVisibleState('loading');
      setElapsedSeconds(0);
      previousLoadingRef.current = true;
      return;
    }

    if (previousLoadingRef.current) {
      setVisibleState(diagnosis.error ? 'error' : 'success');
      hideTimerRef.current = window.setTimeout(() => {
        setVisibleState(null);
        hideTimerRef.current = null;
      }, diagnosis.error ? 4800 : 3200);
    }
    previousLoadingRef.current = false;

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [diagnosis.error, diagnosis.loading]);

  useEffect(() => {
    if (!diagnosis.loading) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [diagnosis.loading]);

  if (!visibleState) return null;

  const streamingLength = diagnosis.streamingText?.length ?? 0;
  const progress = visibleState === 'loading'
    ? Math.min(94, Math.max(12, Math.round((streamingLength / 2200) * 82) + Math.min(12, elapsedSeconds)))
    : 100;
  const stepKeys = [
    'diagnosisPanel.loading.initial',
    'diagnosisPanel.loading.scanning',
    'diagnosisPanel.loading.thinking',
    'diagnosisPanel.loading.reviewing',
  ];
  const activeStep = visibleState === 'loading'
    ? Math.min(stepKeys.length - 1, Math.floor(progress / 28))
    : stepKeys.length;
  const title = visibleState === 'loading'
    ? t('previewToolbar.aiDiagnosis')
    : visibleState === 'error'
      ? t('diagnosisError.failed')
      : t('diagnosisPanel.aiResults');
  const description = visibleState === 'loading'
    ? t(stepKeys[activeStep])
    : visibleState === 'error'
      ? (diagnosis.error || t('diagnosisPanel.loading.stillWorking'))
      : diagnosis.items.length > 0
        ? t('diagnosisPanel.suggestionCount', { count: diagnosis.items.length })
        : t('diagnosisPanel.noSuggestions');

  return (
    <TaskProgressDock
      visible
      taskType="diagnosis"
      status={visibleState}
      title={title}
      description={description}
      progress={progress}
      mobile={mobile}
      excludeId="diagnosis-progress-dock"
    />
  );
}

export function PreviewPanel({ previewRef, onPageCountChange, canvasToolbar, isMobile = false, isActive = true }: PreviewPanelProps) {
  const { ui, uiDispatch } = useAppUI();
  const { t } = useTranslation('editor');
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const canvasPanStartRef = useRef<CanvasPanStart | null>(null);
  const canvasPanPointerIdRef = useRef<number | null>(null);
  const ignoreNextMouseUpRef = useRef(false);
  const initialAutoFitDoneRef = useRef(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [viewportWidth, setViewportWidth] = useState(0);
  const [canvasMovePinned, setCanvasMovePinned] = useState(false);
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const spacePanActiveRef = useRef(false);
  const [mobileToolbarCollapsed, setMobileToolbarCollapsed] = useState(true);
  const bottomGap = isMobile ? 96 : 48;
  const previewGridSize = Math.max(12, Math.round(24 * ui.zoom));
  const canvasMoveActive = canvasMovePinned;

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canvasMoveActive) {
        event.preventDefault();
        spacePanActiveRef.current = false;
        setCanvasMovePinned(false);
        setIsCanvasPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvasMoveActive]);

  // Space 键临时进入移动画布模式
  useEffect(() => {
    const handleSpaceDown = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.code !== 'Space') return;
      if (event.repeat) return;

      const target = event.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      if (!canvasMovePinned) {
        event.preventDefault();
        spacePanActiveRef.current = true;
        setCanvasMovePinned(true);
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
        setCanvasMovePinned(false);
        setIsCanvasPanning(false);
      }
    };

    window.addEventListener('keydown', handleSpaceDown);
    window.addEventListener('keyup', handleSpaceUp);

    return () => {
      window.removeEventListener('keydown', handleSpaceDown);
      window.removeEventListener('keyup', handleSpaceUp);
    };
  }, [canvasMovePinned]);

  const setZoom = useCallback(
    (newZoom: number) => {
      uiDispatch({ type: 'SET_ZOOM', payload: newZoom });
    },
    [uiDispatch]
  );

  const resetPanOffset = useCallback(() => {
    setPanOffsetX(0);
    setPanOffsetY(0);
  }, []);

  const handleFitToWidth = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const fitScale = calculateFitPreviewZoom(container.clientWidth, isMobile ? 24 : 64);
    uiDispatch({ type: 'SET_ZOOM', payload: fitScale });
    resetPanOffset();
  }, [isMobile, uiDispatch, resetPanOffset]);

  // 首次进入可见预览时自适应一次，之后 zoom 仅由用户手动调整。
  useEffect(() => {
    if (initialAutoFitDoneRef.current) return;
    if (!isActive) return;
    if (ui.zoom !== 1) {
      initialAutoFitDoneRef.current = true;
      return;
    }

    const container = scrollContainerRef.current;
    if (!container || container.clientWidth <= 0) return;

    const fitScale = calculateFitPreviewZoom(container.clientWidth, isMobile ? 24 : 64, 1);
    initialAutoFitDoneRef.current = true;

    if (fitScale < 1) {
      uiDispatch({ type: 'SET_ZOOM', payload: fitScale });
    }
  }, [isActive, isMobile, ui.zoom, uiDispatch]);

  useEffect(() => {
    const handleCtrlWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;

      event.preventDefault();
      event.stopPropagation();

      setZoom(previewZoomFromWheel(ui.zoom, event.deltaY));
    };

    const options: AddEventListenerOptions = { passive: false, capture: true };
    document.addEventListener('wheel', handleCtrlWheel, options);
    return () => document.removeEventListener('wheel', handleCtrlWheel, options);
  }, [setZoom, ui.zoom]);

  const setPreviewContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      previewContentRef.current = node;
      (previewRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [previewRef],
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

  useEffect(() => {
    if (!canvasMoveActive) return;
    closeToolbar();
    window.getSelection()?.removeAllRanges();
  }, [canvasMoveActive, closeToolbar]);

  useEffect(() => {
    if (canvasMoveActive) return;
    canvasPanStartRef.current = null;
    canvasPanPointerIdRef.current = null;
    setIsCanvasPanning(false);
  }, [canvasMoveActive]);

  useEffect(() => {
    if (!isCanvasPanning) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [isCanvasPanning]);

  const handleToggleCanvasMove = useCallback(() => {
    spacePanActiveRef.current = false;
    setCanvasMovePinned((active) => !active);
  }, []);

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if (!canvasMoveActive) {
        if (isMobile) setMobileToolbarCollapsed(true);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeToolbar();
      window.getSelection()?.removeAllRanges();

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
    [canvasMoveActive, closeToolbar, isMobile, panOffsetX, panOffsetY],
  );

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isCanvasPanning || canvasPanPointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();

      const panStart = canvasPanStartRef.current;
      if (!panStart) return;

      const dx = event.clientX - panStart.pointerX;
      const dy = event.clientY - panStart.pointerY;
      let newPanX = panStart.panOffsetX + dx;
      let newPanY = panStart.panOffsetY + dy;

      // Boundary limits: keep at least some content visible
      const container = scrollContainerRef.current;
      if (container && previewSize.width > 0 && previewSize.height > 0) {
        const contentW = previewSize.width * ui.zoom;
        const contentH = previewSize.height * ui.zoom;
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
    [isCanvasPanning, previewSize.width, previewSize.height, ui.zoom],
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
    window.getSelection()?.removeAllRanges();
    window.setTimeout(() => {
      ignoreNextMouseUpRef.current = false;
    }, 0);
  }, []);

  const handlePreviewMouseUp = useCallback(() => {
    if (canvasMoveActive || ignoreNextMouseUpRef.current) return;
    handleMouseUp();
  }, [canvasMoveActive, handleMouseUp]);

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
