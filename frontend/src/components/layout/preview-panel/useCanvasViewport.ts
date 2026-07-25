import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { calculateFitPreviewZoom, previewZoomFromWheel } from '../../../utils/previewZoom';

interface CanvasPanStart {
  pointerX: number;
  pointerY: number;
  panOffsetX: number;
  panOffsetY: number;
}

interface UseCanvasViewportOptions {
  previewRef: RefObject<HTMLDivElement>;
  previewContentRef: MutableRefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  setZoom: (zoom: number) => void;
  isMobile: boolean;
  isActive: boolean;
  closeToolbar: () => void;
  handleMouseUp: () => void;
}

export function useCanvasViewport({
  previewRef,
  previewContentRef,
  scrollContainerRef,
  zoom,
  setZoom,
  isMobile,
  isActive,
  closeToolbar,
  handleMouseUp,
}: UseCanvasViewportOptions) {
  const canvasPanStartRef = useRef<CanvasPanStart | null>(null);
  const canvasPanPointerIdRef = useRef<number | null>(null);
  const ignoreNextMouseUpRef = useRef(false);
  const initialAutoFitDoneRef = useRef(false);
  const spacePanActiveRef = useRef(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [viewportWidth, setViewportWidth] = useState(0);
  const [canvasMovePinned, setCanvasMovePinned] = useState(false);
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [mobileToolbarCollapsed, setMobileToolbarCollapsed] = useState(true);
  const canvasMoveActive = canvasMovePinned;

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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasMoveActive]);

  useEffect(() => {
    const isEditableTarget = (target: HTMLElement) => {
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };
    const handleSpaceDown = (event: KeyboardEvent) => {
      if ((event.key !== ' ' && event.code !== 'Space') || event.repeat) return;
      if (isEditableTarget(event.target as HTMLElement)) return;
      if (!canvasMovePinned) {
        event.preventDefault();
        spacePanActiveRef.current = true;
        setCanvasMovePinned(true);
      }
    };
    const handleSpaceUp = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.code !== 'Space') return;
      if (isEditableTarget(event.target as HTMLElement)) return;
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

  const resetPanOffset = useCallback(() => {
    setPanOffsetX(0);
    setPanOffsetY(0);
  }, []);

  const handleFitToWidth = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setZoom(calculateFitPreviewZoom(container.clientWidth, isMobile ? 24 : 64));
    resetPanOffset();
  }, [isMobile, resetPanOffset, scrollContainerRef, setZoom]);

  useEffect(() => {
    if (initialAutoFitDoneRef.current || !isActive) return;
    if (zoom !== 1) {
      initialAutoFitDoneRef.current = true;
      return;
    }
    const container = scrollContainerRef.current;
    if (!container || container.clientWidth <= 0) return;
    const fitScale = calculateFitPreviewZoom(container.clientWidth, isMobile ? 24 : 64, 1);
    initialAutoFitDoneRef.current = true;
    if (fitScale < 1) setZoom(fitScale);
  }, [isActive, isMobile, scrollContainerRef, setZoom, zoom]);

  useEffect(() => {
    const handleCtrlWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      setZoom(previewZoomFromWheel(zoom, event.deltaY));
    };
    const options: AddEventListenerOptions = { passive: false, capture: true };
    document.addEventListener('wheel', handleCtrlWheel, options);
    return () => document.removeEventListener('wheel', handleCtrlWheel, options);
  }, [setZoom, zoom]);

  const setPreviewContentRef = useCallback((node: HTMLDivElement | null) => {
    previewContentRef.current = node;
    (previewRef as MutableRefObject<HTMLDivElement | null>).current = node;
  }, [previewContentRef, previewRef]);

  useLayoutEffect(() => {
    const node = previewContentRef.current;
    if (!node) return;
    const updateSize = () => setPreviewSize({ width: node.offsetWidth, height: node.offsetHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [previewContentRef]);

  useLayoutEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) return;
    const updateWidth = () => setViewportWidth(Math.max(0, node.clientWidth - (isMobile ? 24 : 64)));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isMobile, scrollContainerRef]);

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

  const handleCanvasPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (!canvasMoveActive) {
      if (isMobile) setMobileToolbarCollapsed(true);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    closeToolbar();
    window.getSelection()?.removeAllRanges();
    canvasPanStartRef.current = { pointerX: event.clientX, pointerY: event.clientY, panOffsetX, panOffsetY };
    canvasPanPointerIdRef.current = event.pointerId;
    ignoreNextMouseUpRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsCanvasPanning(true);
  }, [canvasMoveActive, closeToolbar, isMobile, panOffsetX, panOffsetY]);

  const handleCanvasPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isCanvasPanning || canvasPanPointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const panStart = canvasPanStartRef.current;
    if (!panStart) return;
    let newPanX = panStart.panOffsetX + event.clientX - panStart.pointerX;
    let newPanY = panStart.panOffsetY + event.clientY - panStart.pointerY;
    const container = scrollContainerRef.current;
    if (container && previewSize.width > 0 && previewSize.height > 0) {
      const contentW = previewSize.width * zoom;
      const contentH = previewSize.height * zoom;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const minVisible = Math.min(100, cw * 0.15, ch * 0.15);
      const wrapperLeft = (cw - contentW) / 2;
      const wrapperTop = (ch - contentH) / 2;
      newPanX = Math.max(minVisible - wrapperLeft - contentW, Math.min(cw - minVisible - wrapperLeft, newPanX));
      newPanY = Math.max(minVisible - wrapperTop - contentH, Math.min(ch - minVisible - wrapperTop, newPanY));
    }
    setPanOffsetX(newPanX);
    setPanOffsetY(newPanY);
  }, [isCanvasPanning, previewSize.height, previewSize.width, scrollContainerRef, zoom]);

  const stopCanvasPanning = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (canvasPanPointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
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

  return {
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
  };
}
