import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: ReactNode;
  enabled?: boolean;
  position?: 'top' | 'bottom' | 'right';
  triggerClassName?: string;
}

const SHOW_DELAY = 300;
const GAP = 6;

function TooltipInner({ content, children, position = 'top', triggerClassName }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<number | null>(null);

  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [actualPosition, setActualPosition] = useState<'top' | 'bottom' | 'right'>(
    position,
  );

  const clearTimer = useCallback(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setAnimating(false);
  }, [clearTimer]);

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (position === 'right') {
      // Position tooltip to the right of the trigger
      const left = triggerRect.right + GAP;
      let top =
        triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      top = Math.max(4, Math.min(top, viewportHeight - tooltipRect.height - 4));

      setTooltipPos({ top, left });
      setActualPosition('right');
      return;
    }

    let left =
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(8, Math.min(left, viewportWidth - tooltipRect.width - 8));

    const topAbove = triggerRect.top - tooltipRect.height - GAP;
    const topBelow = triggerRect.bottom + GAP;

    if (position === 'top' && topAbove >= 4) {
      setTooltipPos({ top: topAbove, left });
      setActualPosition('top');
    } else if (topBelow + tooltipRect.height <= viewportHeight - 8) {
      setTooltipPos({ top: topBelow, left });
      setActualPosition('bottom');
    } else {
      setTooltipPos({ top: Math.max(4, topAbove), left });
      setActualPosition('top');
    }
  }, [position]);

  const handleMouseEnter = useCallback(() => {
    if (!content) return;
    clearTimer();
    showTimerRef.current = window.setTimeout(() => {
      setVisible(true);
    }, SHOW_DELAY);
  }, [clearTimer, content]);

  const handleMouseLeave = useCallback(() => {
    hide();
    setVisible(false);
  }, [hide]);

  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => {
      computePosition();
      requestAnimationFrame(() => {
        setAnimating(true);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [visible, computePosition]);

  useEffect(() => {
    if (!content) {
      clearTimer();
      setAnimating(false);
      setVisible(false);
    }
  }, [content, clearTimer]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex ${triggerClassName ?? ''}`}
      >
        {children}
      </span>
      {visible && content &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={[
              'pointer-events-none fixed z-[10001] select-none',
              'rounded-lg px-[10px] py-[6px] text-xs !leading-[18px]',
              // 浅色模式：深色背景 + 白色文字
              '!bg-gray-900 !text-white',
              'border border-white/10',
              'shadow-[0_4px_16px_rgba(0,0,0,0.22)]',
              // 深色模式：浅色背景 + 深色文字 + 清晰边框
              'dark:!bg-white dark:!text-gray-900',
              'dark:border dark:border-gray-200',
              'dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]',
              'transition-[opacity,transform] duration-150 ease-out',
              'max-w-[220px] whitespace-nowrap',
            ].join(' ')}
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              opacity: animating ? 1 : 0,
              transform: animating
                ? 'translateY(0) translateX(0)'
                : actualPosition === 'right'
                  ? 'translateX(-4px)'
                  : actualPosition === 'top'
                    ? 'translateY(4px)'
                    : 'translateY(-4px)',
            }}
          >
            {content}
            {/* Arrow — 浅色模式深色 / 深色模式浅色 */}
            <div
              className={[
                'absolute h-[6px] w-[6px] rotate-45',
                '!bg-gray-900 dark:!bg-white',
                'border border-white/10 dark:border dark:border-gray-200',
              ].join(' ')}
              style={
                actualPosition === 'right'
                  ? { left: '-3px', top: '50%', marginTop: '-3px', borderBottom: 'none', borderLeft: 'none' }
                  : actualPosition === 'top'
                    ? { top: 'calc(100% - 3px)', left: '50%', marginLeft: '-3px', borderTop: 'none', borderLeft: 'none' }
                    : { bottom: 'calc(100% - 3px)', left: '50%', marginLeft: '-3px', borderBottom: 'none', borderRight: 'none' }
              }
            />
          </div>,
          document.body,
        )}
    </>
  );
}

export function Tooltip({ enabled = false, children, ...props }: TooltipProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  return <TooltipInner {...props}>{children}</TooltipInner>;
}
