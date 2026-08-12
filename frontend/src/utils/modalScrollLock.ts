export function lockModalScroll() {
  const root = document.documentElement;
  const body = document.body;
  const previousBodyOverflow = body.style.overflow;
  const previousBodyOverscroll = body.style.overscrollBehavior;
  const previousBodyPaddingRight = body.style.paddingRight;
  const previousRootOverscroll = root.style.overscrollBehavior;
  const previousScrollbarWidth = root.style.getPropertyValue('--modal-scrollbar-width');
  const alreadyLocked = root.classList.contains('modal-scroll-lock');
  const documentScrollAlreadyLocked =
    root.classList.contains('admin-route-fullscreen') ||
    root.classList.contains('resume-route-fullscreen') ||
    body.classList.contains('admin-route-fullscreen') ||
    body.classList.contains('resume-route-fullscreen');
  // Modern browsers keep the existing gutter through `scrollbar-gutter: stable`,
  // so adding body padding would double-compensate it. In particular, an
  // off-screen scroll box can report a desktop scrollbar on mobile emulation
  // even though the viewport itself uses overlay scrollbars.
  const hasStableScrollbarGutter =
    typeof CSS !== 'undefined' && CSS.supports('scrollbar-gutter: stable');
  const viewportScrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
  const scrollbarWidth = documentScrollAlreadyLocked || hasStableScrollbarGutter
    ? 0
    : viewportScrollbarWidth;

  root.style.setProperty('--modal-scrollbar-width', `${scrollbarWidth}px`);
  root.classList.add('modal-scroll-lock');
  body.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';
  if (scrollbarWidth > 0) {
    const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
  }
  root.style.overscrollBehavior = 'none';

  return () => {
    if (!alreadyLocked) root.classList.remove('modal-scroll-lock');
    body.style.overflow = previousBodyOverflow;
    body.style.overscrollBehavior = previousBodyOverscroll;
    body.style.paddingRight = previousBodyPaddingRight;
    root.style.overscrollBehavior = previousRootOverscroll;

    if (previousScrollbarWidth) {
      root.style.setProperty('--modal-scrollbar-width', previousScrollbarWidth);
    } else {
      root.style.removeProperty('--modal-scrollbar-width');
    }
  };
}
