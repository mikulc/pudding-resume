import { useCallback, useEffect, useRef, useState } from 'react';

const MENU_WIDTH = 148;
const MENU_ESTIMATED_HEIGHT = 196;
const MENU_GAP = 8;
const MENU_VIEWPORT_PADDING = 8;

export function useResumeMenu() {
  // Dropdown menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const renamePopoverRef = useRef<HTMLDivElement | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const getMenuPosition = useCallback((id: string) => {
    const btn = menuBtnRefs.current[id];
    if (!btn || !document.body.contains(btn)) return null;

    const rect = btn.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    if (rect.bottom < 0 || rect.top > viewportH) return null;

    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const showBelow =
      spaceBelow >= MENU_ESTIMATED_HEIGHT + MENU_GAP || spaceBelow >= spaceAbove;

    const rawTop = showBelow
      ? rect.bottom + MENU_GAP
      : rect.top - MENU_ESTIMATED_HEIGHT - MENU_GAP;
    const maxTop = Math.max(
      MENU_VIEWPORT_PADDING,
      viewportH - MENU_ESTIMATED_HEIGHT - MENU_VIEWPORT_PADDING,
    );
    const top = Math.min(Math.max(MENU_VIEWPORT_PADDING, rawTop), maxTop);

    let left = rect.right - MENU_WIDTH;
    if (left < MENU_VIEWPORT_PADDING) left = MENU_VIEWPORT_PADDING;
    if (left + MENU_WIDTH > viewportW - MENU_VIEWPORT_PADDING) {
      left = viewportW - MENU_WIDTH - MENU_VIEWPORT_PADDING;
    }

    return { top, left };
  }, []);

  const updateMenuPosition = useCallback((id: string) => {
    const nextPosition = getMenuPosition(id);
    if (!nextPosition) {
      setMenuOpenId((currentId) => (currentId === id ? null : currentId));
      return;
    }
    setMenuPos(nextPosition);
  }, [getMenuPosition]);

  // Open menu on button click and position it above or below based on available space.
  const handleMenuToggle = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRenamingId(null);
    if (menuOpenId === id) {
      setMenuOpenId(null);
      return;
    }
    const nextPosition = getMenuPosition(id);
    if (!nextPosition) return;
    setMenuPos(nextPosition);
    setMenuOpenId(id);
  }, [getMenuPosition, menuOpenId]);

  useEffect(() => {
    if (!menuOpenId) return;

    let frameId: number | null = null;
    const scheduleUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateMenuPosition(menuOpenId);
      });
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [menuOpenId, updateMenuPosition]);

  // Close menu on click outside
  const handleMenuClose = useCallback(() => {
    setMenuOpenId(null);
  }, []);

  useEffect(() => {
    if (!menuOpenId && !renamingId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpenId(null);
      setRenamingId(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpenId, renamingId]);

  useEffect(() => {
    if (!renamingId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (renamePopoverRef.current?.contains(target)) return;
      setRenamingId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [renamingId]);


  return {
    menuOpenId, setMenuOpenId, menuPos, menuBtnRefs, renamePopoverRef,
    renamingId, setRenamingId, renameValue, setRenameValue,
    handleMenuToggle, handleMenuClose,
  };
}

export type ResumeMenuModel = ReturnType<typeof useResumeMenu>;
