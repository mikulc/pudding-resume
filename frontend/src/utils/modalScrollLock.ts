const DEFAULT_GUTTER_BACKGROUND =
  'color-mix(in srgb, var(--bg-page) 65%, rgb(2 6 23) 35%)';

export function lockModalScroll(gutterBackground = DEFAULT_GUTTER_BACKGROUND) {
  const root = document.documentElement;
  const body = document.body;
  const previousBodyOverflow = body.style.overflow;
  const previousBodyOverscroll = body.style.overscrollBehavior;
  const previousBodyPaddingRight = body.style.paddingRight;
  const previousRootOverscroll = root.style.overscrollBehavior;
  const previousScrollbarWidth = root.style.getPropertyValue('--modal-scrollbar-width');
  const previousGutterBackground = root.style.getPropertyValue('--modal-scroll-gutter-background');
  const alreadyLocked = root.classList.contains('modal-scroll-lock');
  const documentScrollAlreadyLocked =
    root.classList.contains('admin-route-fullscreen') ||
    root.classList.contains('resume-route-fullscreen') ||
    body.classList.contains('admin-route-fullscreen') ||
    body.classList.contains('resume-route-fullscreen');
  const hasStableScrollbarGutter =
    typeof CSS !== 'undefined' && CSS.supports('scrollbar-gutter: stable');
  // Keep the stable gutter so the background layout does not move. The root
  // background paints the reserved scrollbar area in the modal overlay color.
  const viewportScrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
  const scrollbarWidth = documentScrollAlreadyLocked || hasStableScrollbarGutter
    ? 0
    : viewportScrollbarWidth;

  root.style.setProperty('--modal-scrollbar-width', `${scrollbarWidth}px`);
  root.style.setProperty('--modal-scroll-gutter-background', gutterBackground);
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

    if (previousGutterBackground) {
      root.style.setProperty('--modal-scroll-gutter-background', previousGutterBackground);
    } else {
      root.style.removeProperty('--modal-scroll-gutter-background');
    }
  };
}
