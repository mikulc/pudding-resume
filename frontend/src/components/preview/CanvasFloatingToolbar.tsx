import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  GripVertical,
  SlidersHorizontal,
} from 'lucide-react';
import type { ActiveAiTask } from '../../context/AiTaskContext';

export type CanvasToolbarDock = 'left' | 'bottom' | 'right';

/** 编辑页使用的 action props（独立类型，不耦合外壳） */
export interface CanvasToolbarActions {
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  autoFitActive: boolean;
  isAutoFitting: boolean;
  aiHasResults: boolean;
  aiItemCount: number;
  aiLoading: boolean;
  atsHasResults: boolean;
  atsLoading: boolean;
  activeAiTask: ActiveAiTask;
  onUndo: () => void;
  onRedo: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onToggleAutoFit: () => void;
  onFitToWidth: () => void;
  onRunAiCheck: () => void | Promise<void>;
  onOpenAts: () => void;
}

/** children render prop 提供的工具函数 */
export interface ToolbarHelpers {
  buttonClass: (active?: boolean, withText?: boolean, noActiveBg?: boolean) => string;
  dividerClass: string;
  isVertical: boolean;
  isCompactHorizontal: boolean;
  onDragStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

interface CanvasFloatingToolbarProps {
  viewportRef: React.RefObject<HTMLElement | null>;
  mobile?: boolean;
  mobileCollapsed?: boolean;
  onMobileCollapsedChange?: (collapsed: boolean) => void;
  /** localStorage key for dock position，默认编辑页 key */
  storageKey?: string;
  /** 移动端是否强制底部布局（跳过侧边栏） */
  forceBottomOnMobile?: boolean;
  children: (helpers: ToolbarHelpers) => React.ReactNode;
}

interface Size {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

const EDITOR_STORAGE_KEY = 'resume_editor_canvas_toolbar_dock';
const COLLAPSED_STORAGE_KEY = 'resume_editor_canvas_toolbar_mobile_collapsed';
const COLLAPSED_BTN_SIDE_KEY = 'resume_editor_collapsed_btn_side';
const COLLAPSED_BTN_Y_KEY = 'resume_editor_collapsed_btn_y';
const EDGE_GAP = 16;
const BOTTOM_GAP = 18;
const MIN_SIDE_DOCK_WIDTH = 720;
const MIN_SIDE_DOCK_HEIGHT = 380;
const DOCKS: CanvasToolbarDock[] = ['left', 'bottom', 'right'];
const COLLAPSED_DRAG_THRESHOLD = 5;
const MOBILE_SAFE_TOP = 48;
const MOBILE_SAFE_BOTTOM = 72;

function isDock(value: string | null): value is CanvasToolbarDock {
  return value === 'left' || value === 'bottom' || value === 'right';
}

function getInitialDock(key: string): CanvasToolbarDock {
  if (typeof window === 'undefined') return 'bottom';
  const stored = window.localStorage.getItem(key);
  return isDock(stored) ? stored : 'bottom';
}

function getInitialMobileCollapsed() {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

function shouldForceBottom(size: Size) {
  return size.width < MIN_SIDE_DOCK_WIDTH || size.height < MIN_SIDE_DOCK_HEIGHT;
}

function getAvailableDocks(size: Size): CanvasToolbarDock[] {
  return shouldForceBottom(size) ? ['bottom'] : DOCKS;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function clampPosition(position: Point, viewport: Size, toolbar: Size): Point {
  const maxX = Math.max(EDGE_GAP, viewport.width - toolbar.width - EDGE_GAP);
  const maxY = Math.max(EDGE_GAP, viewport.height - toolbar.height - EDGE_GAP);
  return {
    x: clamp(position.x, EDGE_GAP, maxX),
    y: clamp(position.y, EDGE_GAP, maxY),
  };
}

function getAnchor(dock: CanvasToolbarDock, viewport: Size, toolbar: Size): Point {
  const centerX = (viewport.width - toolbar.width) / 2;
  const centerY = (viewport.height - toolbar.height) / 2;

  if (dock === 'left') {
    return clampPosition({ x: EDGE_GAP, y: centerY }, viewport, toolbar);
  }

  if (dock === 'right') {
    return clampPosition(
      { x: viewport.width - toolbar.width - EDGE_GAP, y: centerY },
      viewport,
      toolbar,
    );
  }

  return clampPosition(
    { x: centerX, y: viewport.height - toolbar.height - BOTTOM_GAP },
    viewport,
    toolbar,
  );
}

function getNearestDock(
  position: Point,
  viewport: Size,
  toolbar: Size,
  docks: CanvasToolbarDock[],
) {
  return docks.reduce(
    (nearest, dock) => {
      const anchor = getAnchor(dock, viewport, toolbar);
      const distance = Math.hypot(position.x - anchor.x, position.y - anchor.y);
      return distance < nearest.distance ? { dock, distance } : nearest;
    },
    { dock: docks[0], distance: Number.POSITIVE_INFINITY },
  );
}

export function CanvasFloatingToolbar({
  viewportRef,
  mobile = false,
  mobileCollapsed: externalMobileCollapsed,
  onMobileCollapsedChange,
  storageKey,
  forceBottomOnMobile = false,
  children,
}: CanvasFloatingToolbarProps) {
  const { t } = useTranslation('editor');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const hasResolvedInitialPositionRef = useRef(false);

  const dockStorageKey = storageKey ?? EDITOR_STORAGE_KEY;

  const [preferredDock, setPreferredDock] = useState<CanvasToolbarDock>(
    () => getInitialDock(dockStorageKey),
  );
  const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
  const [toolbarSize, setToolbarSize] = useState<Size>({ width: 0, height: 0 });
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [positionReady, setPositionReady] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [internalMobileCollapsed, setInternalMobileCollapsed] = useState(getInitialMobileCollapsed);
  const mobileCollapsed = externalMobileCollapsed ?? internalMobileCollapsed;
  const setMobileCollapsed = onMobileCollapsedChange ?? setInternalMobileCollapsed;

  // ── collapsed button drag state ──
  const [collapsedBtnSide, setCollapsedBtnSide] = useState<'left' | 'right'>(() => {
    if (typeof window === 'undefined') return 'right';
    const stored = window.localStorage.getItem(COLLAPSED_BTN_SIDE_KEY);
    return stored === 'left' ? 'left' : 'right';
  });
  const [collapsedBtnY, setCollapsedBtnY] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(COLLAPSED_BTN_Y_KEY);
    const num = stored ? Number(stored) : NaN;
    return isNaN(num) ? null : num;
  });
  const [isCollapsedDragging, setIsCollapsedDragging] = useState(false);
  const collapsedDragMovedRef = useRef(false);
  const collapsedDragStartRef = useRef<Point>({ x: 0, y: 0 });

  const effectiveDock = mobile
    ? forceBottomOnMobile
      ? (shouldForceBottom(viewportSize) ? 'bottom' : preferredDock)
      : (preferredDock === 'left' ? 'left' : 'right')
    : shouldForceBottom(viewportSize)
      ? 'bottom'
      : preferredDock;
  const isVertical = (mobile && !forceBottomOnMobile) || effectiveDock !== 'bottom';
  const isCompactHorizontal = !isVertical && viewportSize.width < 520;

  const setToolbarPosition = useCallback((next: Point) => {
    positionRef.current = next;
    setPosition(next);
  }, []);

  // ── Measure viewport & toolbar sizes ──
  useLayoutEffect(() => {
    let observer: ResizeObserver | null = null;
    let frameId = 0;
    let removeResizeListener: (() => void) | null = null;

    const updateMeasurements = (viewport: HTMLElement, toolbar: HTMLDivElement) => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
      setToolbarSize({
        width: toolbar.offsetWidth,
        height: toolbar.offsetHeight,
      });
    };

    const setupObserver = () => {
      const viewport = viewportRef.current;
      const toolbar = toolbarRef.current;
      if (!viewport || !toolbar) {
        frameId = requestAnimationFrame(setupObserver);
        return;
      }

      const update = () => updateMeasurements(viewport, toolbar);
      update();

      observer = new ResizeObserver(update);
      observer.observe(viewport);
      observer.observe(toolbar);
      window.addEventListener('resize', update);
      removeResizeListener = () => window.removeEventListener('resize', update);
    };

    setupObserver();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer?.disconnect();
      removeResizeListener?.();
    };
  }, [viewportRef]);

  // ── Update position when dock or size changes ──
  useLayoutEffect(() => {
    if (isDragging || isCollapsedDragging || viewportSize.width <= 0 || toolbarSize.width <= 0) return;

    // collapsed button uses custom side + Y from localStorage
    if (mobile && mobileCollapsed && collapsedBtnY !== null) {
      const side = collapsedBtnSide;
      const bw = toolbarSize.width;
      const bh = toolbarSize.height;
      const maxY = Math.max(MOBILE_SAFE_TOP, viewportSize.height - bh - MOBILE_SAFE_BOTTOM);
      setToolbarPosition({
        x: side === 'left' ? EDGE_GAP : viewportSize.width - bw - EDGE_GAP,
        y: clamp(collapsedBtnY, MOBILE_SAFE_TOP, maxY),
      });
    } else {
      setToolbarPosition(getAnchor(effectiveDock, viewportSize, toolbarSize));
    }

    if (!hasResolvedInitialPositionRef.current) {
      hasResolvedInitialPositionRef.current = true;
      setPositionReady(true);
    }
  }, [effectiveDock, isDragging, isCollapsedDragging, mobile, mobileCollapsed, collapsedBtnY, collapsedBtnSide, setToolbarPosition, toolbarSize, viewportSize]);

  // ── Enable motion after initial render ──
  useEffect(() => {
    if (!positionReady || motionEnabled) return;
    const timer = window.setTimeout(() => setMotionEnabled(true), 350);
    return () => window.clearTimeout(timer);
  }, [motionEnabled, positionReady]);

  // ── Main toolbar drag ──
  useEffect(() => {
    if (!isDragging) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const moveToolbar = (event: PointerEvent) => {
      event.preventDefault();
      const viewport = viewportRef.current;
      const toolbar = toolbarRef.current;
      if (!viewport || !toolbar) return;

      const viewportRect = viewport.getBoundingClientRect();
      const nextViewportSize = {
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      };
      const nextToolbarSize = {
        width: toolbar.offsetWidth,
        height: toolbar.offsetHeight,
      };
      const rawPosition = {
        x: event.clientX - viewportRect.left - dragOffsetRef.current.x,
        y: event.clientY - viewportRect.top - dragOffsetRef.current.y,
      };
      const nextPosition = clampPosition(rawPosition, nextViewportSize, nextToolbarSize);

      setToolbarPosition(nextPosition);
    };

    const stopDragging = () => {
      const viewport = viewportRef.current;
      const toolbar = toolbarRef.current;
      if (!viewport || !toolbar) {
        setIsDragging(false);
        return;
      }

      const nextViewportSize = {
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      };
      const nextToolbarSize = {
        width: toolbar.offsetWidth,
        height: toolbar.offsetHeight,
      };
      const nearest = getNearestDock(
        positionRef.current,
        nextViewportSize,
        nextToolbarSize,
        mobile && !forceBottomOnMobile
          ? ['left', 'right']
          : getAvailableDocks(nextViewportSize),
      );

      setPreferredDock(nearest.dock);
      window.localStorage.setItem(dockStorageKey, nearest.dock);
      setIsDragging(false);
    };

    document.addEventListener('pointermove', moveToolbar);
    document.addEventListener('pointerup', stopDragging);
    document.addEventListener('pointercancel', stopDragging);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      document.removeEventListener('pointermove', moveToolbar);
      document.removeEventListener('pointerup', stopDragging);
      document.removeEventListener('pointercancel', stopDragging);
    };
  }, [isDragging, mobile, forceBottomOnMobile, dockStorageKey, setToolbarPosition, viewportRef]);

  // ── collapsed button drag ──
  useEffect(() => {
    if (!isCollapsedDragging || !mobile) return;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const moveButton = (event: PointerEvent) => {
      event.preventDefault();
      const dx = event.clientX - collapsedDragStartRef.current.x;
      const dy = event.clientY - collapsedDragStartRef.current.y;
      if (Math.abs(dx) > COLLAPSED_DRAG_THRESHOLD || Math.abs(dy) > COLLAPSED_DRAG_THRESHOLD) {
        collapsedDragMovedRef.current = true;
      }
      if (!collapsedDragMovedRef.current) return;

      const viewport = viewportRef.current;
      if (!viewport) return;
      const viewportRect = viewport.getBoundingClientRect();
      const bw = toolbarSize.width || 44;
      const bh = toolbarSize.height || 44;
      const maxY = Math.max(MOBILE_SAFE_TOP, viewport.clientHeight - bh - MOBILE_SAFE_BOTTOM);
      const rawX = event.clientX - viewportRect.left - bw / 2;
      const rawY = event.clientY - viewportRect.top - bh / 2;
      setToolbarPosition({
        x: clamp(rawX, EDGE_GAP, viewport.clientWidth - bw - EDGE_GAP),
        y: clamp(rawY, MOBILE_SAFE_TOP, maxY),
      });
    };

    const stopButton = () => {
      setIsCollapsedDragging(false);
      if (!collapsedDragMovedRef.current) return;

      const viewport = viewportRef.current;
      if (!viewport) return;
      const currentPos = positionRef.current;
      const snappedSide: 'left' | 'right' =
        currentPos.x + (toolbarSize.width || 44) / 2 < viewport.clientWidth / 2 ? 'left' : 'right';

      setCollapsedBtnSide(snappedSide);
      setCollapsedBtnY(currentPos.y);
      window.localStorage.setItem(COLLAPSED_BTN_SIDE_KEY, snappedSide);
      window.localStorage.setItem(COLLAPSED_BTN_Y_KEY, String(Math.round(currentPos.y)));
      setPreferredDock(snappedSide);
      window.localStorage.setItem(dockStorageKey, snappedSide);
    };

    document.addEventListener('pointermove', moveButton);
    document.addEventListener('pointerup', stopButton);
    document.addEventListener('pointercancel', stopButton);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.removeEventListener('pointermove', moveButton);
      document.removeEventListener('pointerup', stopButton);
      document.removeEventListener('pointercancel', stopButton);
    };
  }, [isCollapsedDragging, mobile, dockStorageKey, setToolbarPosition, toolbarSize, viewportRef]);

  // ── collapsed button handlers ──
  const setMobileToolbarCollapsed = useCallback((collapsed: boolean) => {
    setMobileCollapsed(collapsed);
    setInternalMobileCollapsed(collapsed);
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  }, [setMobileCollapsed]);

  const handleCollapsedPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    collapsedDragStartRef.current = { x: event.clientX, y: event.clientY };
    collapsedDragMovedRef.current = false;
    setIsCollapsedDragging(true);
  }, []);

  const handleCollapsedClick = useCallback(() => {
    if (collapsedDragMovedRef.current) return;
    setMobileToolbarCollapsed(false);
  }, [setMobileToolbarCollapsed]);

  const handleDragStart = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const rect = toolbar.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const buttonClass = useCallback(
    (active = false, withText = false, noActiveBg = false) =>
      [
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-full text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60',
        'disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent',
        isVertical
          ? 'h-10 w-10'
          : isCompactHorizontal && withText
            ? 'h-9 w-9'
            : withText
            ? 'h-9 min-w-9 px-2.5'
            : 'h-9 w-9',
        active && noActiveBg
          ? 'text-blue-600'
          : active
            ? 'bg-blue-100/80 text-blue-600 shadow-sm shadow-blue-100/80'
            : 'text-gray-600 hover:text-gray-900',
      ].join(' '),
    [isCompactHorizontal, isVertical],
  );

  const dividerClass = isVertical
    ? 'h-px w-7 shrink-0 bg-slate-300/70 my-0.5'
    : 'h-5 w-px shrink-0 bg-slate-300/70 mx-0.5';

  const helpers: ToolbarHelpers = {
    buttonClass,
    dividerClass,
    isVertical,
    isCompactHorizontal,
    onDragStart: handleDragStart,
  };

  return (
    <>
      <div
        ref={toolbarRef}
        className={[
          'no-print absolute left-0 top-0 z-30 select-none',
          (isDragging || isCollapsedDragging)
            ? 'cursor-grabbing'
            : motionEnabled
              ? 'transition-transform duration-200 ease-out'
              : '',
        ].join(' ')}
        style={{
          transform: `translate3d(${Math.round(position.x)}px, ${Math.round(position.y)}px, 0)`,
          opacity: positionReady ? 1 : 0,
          pointerEvents: positionReady ? 'auto' : 'none',
        }}
        data-dock={effectiveDock}
      >
        {mobile && mobileCollapsed ? (
          <button
            type="button"
            onPointerDown={handleCollapsedPointerDown}
            onClick={handleCollapsedClick}
            className={[
              'inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/45 text-blue-600',
              'shadow-[0_12px_28px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.68)] ring-1 ring-slate-900/5 backdrop-blur-2xl',
              'transition-all duration-200 hover:bg-white/55',
              isCollapsedDragging && collapsedDragMovedRef.current
                ? 'scale-110 shadow-[0_20px_48px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.68)] opacity-90'
                : '',
            ].join(' ')}
            style={{ WebkitBackdropFilter: 'blur(24px) saturate(1.35)', backdropFilter: 'blur(24px) saturate(1.35)', touchAction: 'none' }}
            data-global-toolbar-bottom-bar
            data-global-toolbar-collapsed-btn
            aria-label={t('previewToolbar.expand')}
            aria-expanded="false"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        ) : (
        <div
          className={[
            'canvas-floating-toolbar inline-flex items-center border border-white/70 bg-white/75 text-gray-700 shadow-[0_12px_32px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/5 backdrop-blur-xl',
            isVertical ? 'flex-col rounded-[24px] p-1.5' : `${isCompactHorizontal ? 'px-1.5' : 'px-2'} rounded-full py-1.5`,
          ].join(' ')}
          style={{ WebkitBackdropFilter: 'blur(18px)', backdropFilter: 'blur(18px)' }}
          data-global-toolbar-bottom-bar
          role="toolbar"
          aria-orientation={isVertical ? 'vertical' : 'horizontal'}
        >
          {/* 拖拽把手 —— 外壳固定提供 */}
          <button
            type="button"
            onPointerDown={handleDragStart}
            className={[
              'inline-flex shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-700',
              isVertical ? 'h-8 w-10 cursor-grab' : 'h-9 w-8 cursor-grab',
            ].join(' ')}
            style={{ touchAction: 'none' }}
            aria-label={t('previewToolbar.drag')}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* 具体按钮由调用方通过 children 注入 */}
          {children(helpers)}
        </div>
        )}
      </div>
    </>
  );
}
