/**
 * Floating content editor geometry calculations and markdown selection helpers.
 *
 * Extracted from FloatingContentEditor.tsx. Pure logic with no React dependency,
 * so it can be unit-tested in isolation.
 */

export interface PanelGeometry {
  top: number;
  left: number;
  width: number;
  height: number;
  isMobile: boolean;
}

export const EDITOR_MAX_HISTORY = 50;
export const ANCHOR_GAP = 54;
export const PANEL_MIN_WIDTH = 510;
export const PANEL_DEFAULT_WIDTH = 550;
export const PANEL_MAX_WIDTH = 570;
export const PANEL_HEIGHT_RATIO = 0.56;
export const PANEL_MIN_HEIGHT = 420;
export const PANEL_MAX_HEIGHT = 560;
export const MOBILE_LAYOUT_QUERY = '(max-width: 1023px)';
export const VIEWPORT_PADDING = 16;

export function calcAnchorGeometry(
  anchorRect: DOMRect,
  isMobile: boolean,
): PanelGeometry {
  if (isMobile) {
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: true,
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Determine width: clamped between min/max, but also by available space
  const width = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, PANEL_DEFAULT_WIDTH));

  // Determine height
  const preferredHeight = Math.round(viewportHeight * PANEL_HEIGHT_RATIO);
  const height = Math.min(PANEL_MAX_HEIGHT, Math.max(PANEL_MIN_HEIGHT, preferredHeight));

  // Horizontal: try right of anchor first
  let left = anchorRect.right + ANCHOR_GAP;
  const rightEdge = left + width;

  // If overflows right viewport edge, try left side
  if (rightEdge > viewportWidth - VIEWPORT_PADDING) {
    const leftCandidate = anchorRect.left - width - ANCHOR_GAP;
    if (leftCandidate >= VIEWPORT_PADDING) {
      left = leftCandidate;
    } else {
      // Neither side has enough space: pin to viewport edge
      left = Math.max(VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING);
    }
  }

  // Vertical: align top of panel with top of anchor, clamp within viewport
  let top = anchorRect.top;
  const bottomEdge = top + height;
  if (bottomEdge > viewportHeight - VIEWPORT_PADDING) {
    top = Math.max(VIEWPORT_PADDING, viewportHeight - height - VIEWPORT_PADDING);
  }
  if (top < VIEWPORT_PADDING) {
    top = VIEWPORT_PADDING;
  }

  return { top, left, width, height, isMobile: false };
}

export interface MarkdownRange {
  start: number;
  end: number;
}

export function normalizeSelectionText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function buildSearchableMarkdown(sourceText: string): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  let lineStart = true;

  for (let i = 0; i < sourceText.length; i++) {
    if (lineStart) {
      const rest = sourceText.slice(i);
      const listPrefix = rest.match(/^(\s*(?:[-*]\s+|\d+\.\s+))/);
      if (listPrefix) {
        i += listPrefix[0].length - 1;
        continue;
      }
    }

    const ch = sourceText[i];
    if (ch === '\r') continue;
    if (ch === '\n') {
      if (!text.endsWith('\n')) {
        text += '\n';
        map.push(i);
      }
      lineStart = true;
      continue;
    }

    if (ch === '*' || ch === '_') continue;

    text += ch === '\u00a0' ? ' ' : ch;
    map.push(i);
    lineStart = false;
  }

  return { text, map };
}

export function findMarkdownRangeFromSelection(sourceText: string, selectedText: string): MarkdownRange | null {
  const normalizedSelected = normalizeSelectionText(selectedText);
  if (!normalizedSelected) return null;

  const exactIdx = sourceText.indexOf(selectedText);
  if (exactIdx !== -1 && sourceText.indexOf(selectedText, exactIdx + 1) === -1) {
    return { start: exactIdx, end: exactIdx + selectedText.length };
  }

  const searchable = buildSearchableMarkdown(sourceText);
  const normalizedSource = searchable.text;
  const normalizedIdx = normalizedSource.indexOf(normalizedSelected);
  if (normalizedIdx === -1) return null;

  const start = searchable.map[normalizedIdx];
  const endMapIndex = normalizedIdx + normalizedSelected.length - 1;
  const end = (searchable.map[endMapIndex] ?? start) + 1;
  return { start, end };
}

export function normalizeSelectedParagraphBreaks(sourceText: string, range: MarkdownRange): { text: string; range: MarkdownRange } {
  const prefix = sourceText.slice(0, range.start);
  const middle = sourceText.slice(range.start, range.end).replace(/\n{2,}/g, '\n');
  const suffix = sourceText.slice(range.end);

  return {
    text: prefix + middle + suffix,
    range: {
      start: range.start,
      end: range.start + middle.length,
    },
  };
}
