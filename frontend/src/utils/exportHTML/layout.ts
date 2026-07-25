export function setImportantStyle(el: HTMLElement, property: string, value: string): void {
  el.style.setProperty(property, value, 'important');
}

/**
 * Keep fields that are explicitly marked as a single-line export value stable
 * across desktop and mobile browsers. The preview may be scaled to fit a phone,
 * but that responsive presentation must not become export line wrapping or
 * truncation. A field remains intact and its flex container wraps the whole
 * field when there is not enough room.
 */
export function applyExportNoWrap(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-export-nowrap="true"]').forEach((el) => {
    setImportantStyle(el, 'white-space', 'nowrap');
    setImportantStyle(el, 'overflow', 'visible');
    setImportantStyle(el, 'text-overflow', 'clip');
    setImportantStyle(el, 'overflow-wrap', 'normal');
    setImportantStyle(el, 'word-break', 'normal');
    setImportantStyle(el, 'min-width', 'max-content');
    setImportantStyle(el, 'flex-shrink', '0');

    const item = el.parentElement;
    // Icon-mode fields wrap the value in a flex item. Prevent that wrapper
    // from shrinking as well, so the parent flex-wrap layout moves the entire
    // icon + value pair instead of clipping only the text.
    if (item?.classList.contains('min-w-0') && item.querySelector(':scope > svg')) {
      setImportantStyle(item, 'min-width', 'max-content');
      setImportantStyle(item, 'flex-shrink', '0');
    }
  });
}

/**
 * Computed styles contain used pixel heights. Inlining those heights freezes a
 * one-line preview row even when backend Chrome needs a little more room for
 * the same font. Let export title rows grow, and wrap compact-layout fields as
 * complete units instead of breaking words inside a fixed-height row.
 */
export function applyExportTitleRowLayout(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.entry-title-row').forEach((row) => {
    setImportantStyle(row, 'height', 'auto');
    setImportantStyle(row, 'max-height', 'none');
    setImportantStyle(row, 'overflow', 'visible');

    row.querySelectorAll<HTMLElement>(':scope > .min-w-0').forEach((content) => {
      setImportantStyle(content, 'width', 'auto');
      setImportantStyle(content, 'height', 'auto');
      setImportantStyle(content, 'max-width', 'none');
      setImportantStyle(content, 'max-height', 'none');
      setImportantStyle(content, 'flex', '1 1 0%');
      setImportantStyle(content, 'flex-wrap', 'wrap');
      setImportantStyle(content, 'overflow', 'visible');

      content.querySelectorAll<HTMLElement>(':scope > span').forEach((field) => {
        setImportantStyle(field, 'width', 'auto');
        setImportantStyle(field, 'height', 'auto');
        setImportantStyle(field, 'max-width', 'none');
        setImportantStyle(field, 'white-space', 'nowrap');
        setImportantStyle(field, 'overflow-wrap', 'normal');
        setImportantStyle(field, 'word-break', 'normal');
        setImportantStyle(field, 'flex-shrink', '0');
      });
    });
  });
}

/** Keep decorative section labels (for example the teal ribbon) on one line. */
export function applyExportSectionHeaderLayout(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.section-header > span:last-child').forEach((title) => {
    setImportantStyle(title, 'width', 'max-content');
    setImportantStyle(title, 'max-width', 'none');
    setImportantStyle(title, 'white-space', 'nowrap');
    setImportantStyle(title, 'overflow-wrap', 'normal');
    setImportantStyle(title, 'word-break', 'keep-all');
    setImportantStyle(title, 'flex-shrink', '0');
  });
}

export function applyExportLayoutStability(root: HTMLElement): void {
  applyExportNoWrap(root);
  applyExportTitleRowLayout(root);
  applyExportSectionHeaderLayout(root);
}

