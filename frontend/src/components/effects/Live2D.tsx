import { useEffect, useMemo, useRef, useState } from 'react';

export type Live2DPosition = 'left' | 'right' | 'bottom' | 'right-bottom';
export type Live2DNearbyBehavior = 'expand' | 'retract';

/** Live2D mascot props */
export interface Live2DProps {
  position?: Live2DPosition;
  width?: number;
  height?: number;
  hOffset?: number;
  vOffset?: number;
  scale?: number;
  opacity?: number;
  enablePointerEventsPassThrough?: boolean;
  peekVisibleRatio?: number;
  nearbyRetractRatio?: number;
  nearbyBehavior?: Live2DNearbyBehavior;
  proximityThreshold?: number;
  restoreDelay?: number;
  transitionDuration?: number;
  /** 常驻模式：始终完整显示，禁用靠近缩回行为 */
  pinned?: boolean;
}

interface Live2DLayoutConfig extends Required<Omit<Live2DProps, 'pinned'>> {
  isNearby: boolean;
}

let live2dInitPromise: Promise<void> | null = null;

const clamp = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

function distanceToRect(x: number, y: number, rect: DOMRect): number {
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

function getWidgetTransform(config: Live2DLayoutConfig): string {
  const expandedRatio = clamp(config.peekVisibleRatio, 0.05, 1);
  const peekRatio = clamp(config.nearbyRetractRatio, 0.05, 1);
  const visibleRatio = config.nearbyBehavior === 'expand'
    ? (config.isNearby ? expandedRatio : peekRatio)
    : (config.isNearby ? peekRatio : expandedRatio);
  const hiddenX = Math.round(config.width * (1 - visibleRatio));
  const hiddenY = Math.round(config.height * (1 - visibleRatio));

  switch (config.position) {
    case 'left':
      return `translateX(-${hiddenX}px)`;
    case 'bottom':
      return `translateX(-50%) translateY(${hiddenY}px)`;
    case 'right-bottom':
      return `translate(${hiddenX}px, ${hiddenY}px)`;
    case 'right':
    default:
      return `translateX(${hiddenX}px)`;
  }
}

function applyLive2DLayout(config: Live2DLayoutConfig): boolean {
  const el = document.getElementById('live2d-widget');
  if (!el) return false;

  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('position', 'fixed', 'important');
  el.style.setProperty('z-index', '9998', 'important');
  el.style.setProperty('width', `${config.width}px`, 'important');
  el.style.setProperty('height', `${config.height}px`, 'important');
  el.style.setProperty('opacity', String(config.opacity), 'important');
  el.style.setProperty('transition', `transform ${config.transitionDuration}ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease`, 'important');
  el.style.setProperty('transform', getWidgetTransform(config), 'important');
  el.style.setProperty('will-change', 'transform', 'important');
  el.style.setProperty('pointer-events', config.enablePointerEventsPassThrough ? 'none' : 'auto', 'important');

  if (config.position === 'left') {
    el.style.setProperty('left', `${config.hOffset}px`, 'important');
    el.style.setProperty('right', 'auto', 'important');
    el.style.setProperty('bottom', `${config.vOffset}px`, 'important');
    el.style.setProperty('top', 'auto', 'important');
  } else if (config.position === 'bottom') {
    el.style.setProperty('left', `calc(50% + ${config.hOffset}px)`, 'important');
    el.style.setProperty('right', 'auto', 'important');
    el.style.setProperty('bottom', `${config.vOffset}px`, 'important');
    el.style.setProperty('top', 'auto', 'important');
  } else {
    el.style.setProperty('right', `${config.hOffset}px`, 'important');
    el.style.setProperty('left', 'auto', 'important');
    el.style.setProperty('bottom', `${config.vOffset}px`, 'important');
    el.style.setProperty('top', 'auto', 'important');
  }

  const canvas = document.getElementById('live2dcanvas') as HTMLCanvasElement | null;
  if (canvas) {
    const existingTransform = canvas.style.transform
      .replace(/scale\([^)]*\)/g, '')
      .trim();
    canvas.style.transform = `${existingTransform} scale(${config.scale})`.trim();
    canvas.style.transformOrigin = 'center bottom';
    canvas.style.pointerEvents = config.enablePointerEventsPassThrough ? 'none' : 'auto';
  }

  return true;
}

function scheduleLayoutApply(config: Live2DLayoutConfig): () => void {
  if (applyLive2DLayout(config)) return () => {};

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (applyLive2DLayout(config) || attempts >= 20) {
      window.clearInterval(timer);
    }
  }, 100);

  return () => window.clearInterval(timer);
}

export function Live2D({
  position = 'right',
  width = 140,
  height = 260,
  hOffset = 20,
  vOffset = -40,
  scale = 1,
  opacity = 1,
  enablePointerEventsPassThrough = true,
  peekVisibleRatio = 0.72,
  nearbyRetractRatio = 0.28,
  nearbyBehavior = 'retract',
  proximityThreshold = 120,
  restoreDelay = 400,
  transitionDuration = 320,
  pinned = false,
}: Live2DProps = {}) {
  const [isNearby, setIsNearby] = useState(false);
  const isNearbyRef = useRef(false);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const layoutConfig = useMemo<Live2DLayoutConfig>(() => ({
    position,
    width,
    height,
    hOffset,
    vOffset,
    scale,
    opacity,
    enablePointerEventsPassThrough,
    peekVisibleRatio,
    nearbyRetractRatio,
    nearbyBehavior,
    proximityThreshold,
    restoreDelay,
    transitionDuration,
    isNearby,
  }), [
    position,
    width,
    height,
    hOffset,
    vOffset,
    scale,
    opacity,
    enablePointerEventsPassThrough,
    peekVisibleRatio,
    nearbyRetractRatio,
    nearbyBehavior,
    proximityThreshold,
    restoreDelay,
    transitionDuration,
    isNearby,
  ]);
  const latestLayoutConfigRef = useRef(layoutConfig);

  useEffect(() => {
    latestLayoutConfigRef.current = layoutConfig;
  }, [layoutConfig]);

  useEffect(() => {
    if (!live2dInitPromise) {
      live2dInitPromise = import('live2d-widget')
        .then(({ L2Dwidget }) => {
          const originalLog = console.log;
          console.log = () => {};

          try {
            L2Dwidget.init({
              model: {
                jsonPath: '/live2d-models/koharu/assets/koharu.model.json',
                scale: 1,
              },
              display: {
                position: 'right',
                width: 140,
                height: 260,
                hOffset: 20,
                vOffset: -40,
                superSample: 2,
              },
              mobile: { show: true, scale: 1 },
              react: { opacity: 1 },
              dialog: { enable: false, hitokoto: false },
              name: { div: 'live2d-widget', canvas: 'live2dcanvas' },
              dev: { border: false },
            });
          } finally {
            console.log = originalLog;
          }
        })
        .catch((error) => {
          live2dInitPromise = null;
          console.error('Live2D init failed:', error);
        });
    }

    live2dInitPromise.then(() => {
      window.requestAnimationFrame(() => {
        scheduleLayoutApply(latestLayoutConfigRef.current);
      });
    });
  }, []);

  useEffect(() => {
    isNearbyRef.current = isNearby;
    return scheduleLayoutApply(layoutConfig);
  }, [layoutConfig, isNearby]);

  // 常驻模式：重置缩回状态，保持当前可见位置
  useEffect(() => {
    if (pinned) {
      isNearbyRef.current = false;
      setIsNearby(false);
    }
  }, [pinned]);

  useEffect(() => {
    // 常驻模式：不追踪鼠标
    if (pinned) return;

    const clearRestoreTimer = () => {
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
    };

    const setNearby = (next: boolean) => {
      if (isNearbyRef.current === next) return;
      isNearbyRef.current = next;
      setIsNearby(next);
    };

    const scheduleRestore = () => {
      if (!isNearbyRef.current || restoreTimerRef.current) return;
      restoreTimerRef.current = setTimeout(() => {
        restoreTimerRef.current = null;
        setNearby(false);
      }, restoreDelay);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const el = document.getElementById('live2d-widget');
      if (!el || el.style.display === 'none') return;

      const distance = distanceToRect(event.clientX, event.clientY, el.getBoundingClientRect());
      if (distance <= proximityThreshold) {
        clearRestoreTimer();
        setNearby(true);
        return;
      }

      scheduleRestore();
    };

    const handleMouseLeave = () => {
      scheduleRestore();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearRestoreTimer();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [proximityThreshold, restoreDelay, pinned]);

  return null;
}
