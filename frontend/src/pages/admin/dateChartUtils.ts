import { useCallback, useEffect, useRef } from 'react';

export const mobileDateChartMargin = {
  top: 28,
  right: 18,
  bottom: 36,
  left: 8,
};

export const adminChartTooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  backgroundColor: '#ffffff',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
};

export function formatDateAxisTick(value: string, isMobile: boolean) {
  if (!isMobile) return value;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}-${match[3]}` : value;
}

/** Select readable mobile ticks without changing the chart's source data. */
export function selectMobileDateTicks(dates: string[]) {
  if (dates.length <= 5) return dates;

  if (dates.length <= 10) {
    return dates.filter((_, index) => index % 2 === 0 || index === dates.length - 1);
  }

  const middleIndex = Math.floor((dates.length - 1) / 2);
  return [dates[0], dates[middleIndex], dates[dates.length - 1]];
}

/**
 * ResponsiveContainer already resizes the SVG. This observer also emits the
 * resize signal Recharts uses so sidebar transitions and orientation changes
 * are reflected immediately. It is disconnected when the chart unmounts.
 */
export function useChartResizeObserver() {
  const observerRef = useRef<ResizeObserver | null>(null);
  const frameRef = useRef<number | null>(null);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!node || typeof ResizeObserver === 'undefined') return;

    observerRef.current = new ResizeObserver(() => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        frameRef.current = null;
      });
    });
    observerRef.current.observe(node);
  }, []);

  useEffect(() => () => {
    observerRef.current?.disconnect();
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  return setRef;
}
