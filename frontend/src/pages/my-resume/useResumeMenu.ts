import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const MENU_WIDTH = 148;
const MENU_ESTIMATED_HEIGHT = 196;
const MENU_GAP = 8;
const MENU_VIEWPORT_PADDING = 8;

interface MenuAnchorRect {
  top: number;
  right: number;
  bottom: number;
}

interface MenuViewport {
  width: number;
  height: number;
}

export function calculateResumeMenuPosition(
  rect: MenuAnchorRect,
  viewport: MenuViewport,
  menuHeight: number,
) {
  const spaceBelow = viewport.height - rect.bottom;
  const spaceAbove = rect.top;
  const showBelow = spaceBelow >= menuHeight + MENU_GAP || spaceBelow >= spaceAbove;

  const rawTop = showBelow
    ? rect.bottom + MENU_GAP
    : rect.top - menuHeight - MENU_GAP;
  const maxTop = Math.max(
    MENU_VIEWPORT_PADDING,
    viewport.height - menuHeight - MENU_VIEWPORT_PADDING,
  );
  const top = Math.min(Math.max(MENU_VIEWPORT_PADDING, rawTop), maxTop);

  let left = rect.right - MENU_WIDTH;
  if (left < MENU_VIEWPORT_PADDING) left = MENU_VIEWPORT_PADDING;
  if (left + MENU_WIDTH > viewport.width - MENU_VIEWPORT_PADDING) {
    left = viewport.width - MENU_WIDTH - MENU_VIEWPORT_PADDING;
  }

  return { top, left };
}

export function useResumeMenu() {
  // Dropdown menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const renamePopoverRef = useRef<HTMLDivElement | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const getMenuPosition = useCallback((id: string) => {
    const btn = menuBtnRefs.current[id];
    if (!btn || !document.body.contains(btn)) return null;

    const rect = btn.getBoundingClientRect();
    const viewport = { height: window.innerHeight, width: window.innerWidth };

    if (rect.bottom < 0 || rect.top > viewport.height) return null;

    const measuredHeight = menuRef.current?.getBoundingClientRect().height;
    const menuHeight = measuredHeight && measuredHeight > 0
      ? measuredHeight
      : MENU_ESTIMATED_HEIGHT;
    return calculateResumeMenuPosition(rect, viewport, menuHeight);
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

  // The menu has a different height when "upload to cloud" is omitted.
  // Measure the rendered portal before paint so an above-positioned menu
  // keeps the same gap from its trigger regardless of its actions.
  useLayoutEffect(() => {
    if (menuOpenId) updateMenuPosition(menuOpenId);
  }, [menuOpenId, updateMenuPosition]);

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
    menuOpenId, setMenuOpenId, menuPos, menuBtnRefs, menuRef, renamePopoverRef,
    renamingId, setRenamingId, renameValue, setRenameValue,
    handleMenuToggle, handleMenuClose,
  };
}

export type ResumeMenuModel = ReturnType<typeof useResumeMenu>;
