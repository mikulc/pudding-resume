function measureNativeScrollbarWidth() {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.top = '-9999px';
  probe.style.width = '100px';
  probe.style.height = '100px';
  probe.style.overflow = 'scroll';
  document.body.appendChild(probe);
  const width = probe.offsetWidth - probe.clientWidth;
  probe.remove();
  return width;
}

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
  // `clientWidth` may include a stable scrollbar gutter in some browsers.
  // Measure a native scroll box as a fallback so the layout compensation
  // remains identical on regular document-scrolling pages. Fullscreen routes
  // already hide document scrolling, so adding this fallback there would
  // shrink the page even though no viewport scrollbar was removed.
  const viewportScrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
  const scrollbarWidth = documentScrollAlreadyLocked
    ? 0
    : Math.max(viewportScrollbarWidth, measureNativeScrollbarWidth());

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
