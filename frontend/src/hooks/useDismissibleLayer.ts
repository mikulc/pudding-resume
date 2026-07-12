import { RefObject, useEffect, useRef } from 'react';

interface UseDismissibleLayerOptions {
  open: boolean;
  refs: Array<RefObject<HTMLElement>>;
  onDismiss: () => void;
}

function stopOutsideEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function useDismissibleLayer({ open, refs, onDismiss }: UseDismissibleLayerOptions) {
  const refsRef = useRef(refs);
  const onDismissRef = useRef(onDismiss);
  const suppressNextClickRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);

  refsRef.current = refs;
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return;

    const containsTarget = (target: Node | null) => {
      if (!target) return true;
      return refsRef.current.some((ref) => Boolean(ref.current?.contains(target)));
    };

    const installOneShotClickBlocker = () => {
      const blockClick = (event: MouseEvent) => {
        stopOutsideEvent(event);
        document.removeEventListener('click', blockClick, true);
        if (blockerTimer !== null) {
          window.clearTimeout(blockerTimer);
        }
      };
      const blockerTimer = window.setTimeout(() => {
        document.removeEventListener('click', blockClick, true);
      }, 400);
      document.addEventListener('click', blockClick, true);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (containsTarget(event.target as Node | null)) return;
      stopOutsideEvent(event);
      installOneShotClickBlocker();
      suppressNextClickRef.current = true;
      if (suppressTimerRef.current !== null) {
        window.clearTimeout(suppressTimerRef.current);
      }
      suppressTimerRef.current = window.setTimeout(() => {
        suppressNextClickRef.current = false;
        suppressTimerRef.current = null;
      }, 400);
      onDismissRef.current();
    };

    const handleClick = (event: MouseEvent) => {
      if (!suppressNextClickRef.current && containsTarget(event.target as Node | null)) return;
      stopOutsideEvent(event);
      suppressNextClickRef.current = false;
      if (suppressTimerRef.current !== null) {
        window.clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismissRef.current();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      if (suppressTimerRef.current !== null) {
        window.clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = null;
      }
      suppressNextClickRef.current = false;
    };
  }, [open]);
}
