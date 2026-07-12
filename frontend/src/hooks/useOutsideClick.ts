import { useEffect, useRef, type RefObject } from 'react';

interface UseOutsideClickOptions {
  open: boolean;
  refs: Array<RefObject<HTMLElement>>;
  onOutsideClick: () => void;
}

export function useOutsideClick({ open, refs, onOutsideClick }: UseOutsideClickOptions): void {
  const refsRef = useRef(refs);
  const onOutsideClickRef = useRef(onOutsideClick);
  refsRef.current = refs;
  onOutsideClickRef.current = onOutsideClick;

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (refsRef.current.some((ref) => ref.current?.contains(target))) return;
      onOutsideClickRef.current();
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);
}
