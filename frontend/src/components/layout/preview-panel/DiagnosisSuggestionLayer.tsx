import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDiagnosisContext } from '../../../context/DiagnosisContext';
import { AISuggestionBubble } from '../../common/AISuggestionBubble';


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

export function DiagnosisSuggestionLayer({
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

