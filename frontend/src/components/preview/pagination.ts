/**
 * Resume preview pagination algorithm.
 *
 * Pure DOM-measurement + break-point computation logic, extracted from
 * PreviewComponents.tsx. Has no React dependency, so it can be unit-tested
 * in isolation.
 *
 * The algorithm measures rendered DOM elements, identifies "protected ranges"
 * (sections/entries/atoms that should not be split across pages), then picks
 * optimal page-break offsets that respect those protections.
 */

export interface PageProtectedRange {
  start: number;
  end: number;
  priority: number;
  allowInternalBreaks?: boolean;
}

/** mm → CSS px (96dpi) */
export const MM_TO_PX = 3.779527559;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const PAGE_GAP_PX = 24;

const PAGE_BREAK_EPSILON = 0.5;
const MIN_USEFUL_PAGE_SLICE = 24;
const SECTION_PROTECTION_PRIORITY = 100;
const SECTION_INTRO_PRIORITY = 90;
const ENTRY_PROTECTION_PRIORITY = 80;
const ENTRY_INTRO_PRIORITY = 70;
const ATOM_PROTECTION_PRIORITY = 60;

function clampPageOffset(value: number, totalHeight: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(totalHeight, value));
}

function uniqueSortedNumbers(values: number[], totalHeight: number): number[] {
  return [...new Set(values.map((value) => Math.round(clampPageOffset(value, totalHeight))))].sort((a, b) => a - b);
}

function getElementRange(element: HTMLElement, rootTop: number, totalHeight: number): PageProtectedRange | null {
  const rect = element.getBoundingClientRect();
  const start = clampPageOffset(rect.top - rootTop, totalHeight);
  const end = clampPageOffset(rect.bottom - rootTop, totalHeight);
  if (end - start <= PAGE_BREAK_EPSILON) return null;
  return { start, end, priority: ATOM_PROTECTION_PRIORITY };
}

function collectTextLineBreakPoints(
  element: HTMLElement,
  rootTop: number,
  totalHeight: number,
  minLinesBeforeBreak = 2,
): number[] {
  const lineBottoms: number[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (node.textContent?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      Array.from(range.getClientRects()).forEach((rect) => {
        lineBottoms.push(clampPageOffset(rect.bottom - rootTop, totalHeight));
      });
      range.detach();
    }
    node = walker.nextNode();
  }

  return uniqueSortedNumbers(lineBottoms, totalHeight).filter((_, index) => index >= minLinesBeforeBreak - 1);
}

function isSplittableTextAtom(element: HTMLElement | null): boolean {
  return element?.dataset.pageSplittable === 'true';
}

export function computeProtectedPageBreaks(
  validBreakPoints: number[],
  protectedRanges: PageProtectedRange[],
  totalContentHeight: number,
  pageContentHeight: number,
  internalBreakPoints: number[] = [],
): number[] {
  const totalHeight = Math.max(0, totalContentHeight);
  const pageHeight = Math.max(1, pageContentHeight);
  const sorted = uniqueSortedNumbers([0, totalHeight, ...validBreakPoints], totalHeight);
  const internalSorted = uniqueSortedNumbers(internalBreakPoints, totalHeight);
  const ranges = protectedRanges
    .map((range) => ({
      start: clampPageOffset(range.start, totalHeight),
      end: clampPageOffset(range.end, totalHeight),
      priority: range.priority,
      allowInternalBreaks: range.allowInternalBreaks,
    }))
    .filter((range) => range.end - range.start > PAGE_BREAK_EPSILON)
    .filter((range) => range.end - range.start <= pageHeight + PAGE_BREAK_EPSILON)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.start !== b.start) return a.start - b.start;
      return b.end - a.end;
    });

  const pageOffsets: number[] = [0];
  let lastBreak = 0;

  while (lastBreak < totalHeight - PAGE_BREAK_EPSILON) {
    const targetBreak = Math.min(lastBreak + pageHeight, totalHeight);

    if (targetBreak >= totalHeight - PAGE_BREAK_EPSILON) {
      lastBreak = totalHeight;
      pageOffsets.push(totalHeight);
      break;
    }

    const crossingProtectedRange = ranges.find((range) => (
      range.start > lastBreak + MIN_USEFUL_PAGE_SLICE &&
      range.start < targetBreak - PAGE_BREAK_EPSILON &&
      range.end > targetBreak + PAGE_BREAK_EPSILON
    ));

    let bestBreak: number | undefined;

    if (crossingProtectedRange?.allowInternalBreaks) {
      for (const bp of internalSorted) {
        if (
          bp > Math.max(lastBreak + PAGE_BREAK_EPSILON, crossingProtectedRange.start + PAGE_BREAK_EPSILON) &&
          bp <= targetBreak + PAGE_BREAK_EPSILON
        ) {
          bestBreak = bp;
        } else if (bp > targetBreak) {
          break;
        }
      }
    }

    if (bestBreak === undefined) {
      bestBreak = crossingProtectedRange?.start;
    }

    if (bestBreak === undefined) {
      for (const bp of sorted) {
        if (bp > lastBreak + PAGE_BREAK_EPSILON && bp <= targetBreak + PAGE_BREAK_EPSILON) {
          bestBreak = bp;
        } else if (bp > targetBreak) {
          break;
        }
      }
    }

    if (bestBreak === undefined || bestBreak <= lastBreak + PAGE_BREAK_EPSILON) {
      bestBreak = targetBreak;
    }

    bestBreak = clampPageOffset(bestBreak, totalHeight);
    if (bestBreak > lastBreak + PAGE_BREAK_EPSILON) {
      lastBreak = bestBreak;
    } else {
      lastBreak = Math.min(lastBreak + pageHeight, totalHeight);
    }

    if (Math.abs(lastBreak - pageOffsets[pageOffsets.length - 1]) > PAGE_BREAK_EPSILON) {
      pageOffsets.push(lastBreak);
    } else {
      break;
    }

    if (pageOffsets.length > 50) {
      if (pageOffsets[pageOffsets.length - 1] < totalHeight) {
        pageOffsets.push(totalHeight);
      }
      break;
    }
  }

  return pageOffsets;
}

export function collectPaginationBoundaries(flowRoot: HTMLElement, totalHeight: number, pageContentHeight: number) {
  const rootTop = flowRoot.getBoundingClientRect().top;
  const breakPoints = new Set<number>([0, totalHeight]);
  const internalBreakPoints = new Set<number>();
  const protectedRanges: PageProtectedRange[] = [];

  const addBreakPoint = (value: number) => {
    breakPoints.add(clampPageOffset(value, totalHeight));
  };

  const addInternalBreakPoint = (value: number) => {
    const normalized = clampPageOffset(value, totalHeight);
    breakPoints.add(normalized);
    internalBreakPoints.add(normalized);
  };

  const addRange = (range: PageProtectedRange | null, priority: number, allowInternalBreaks = false) => {
    if (!range) return;
    const normalized = {
      start: clampPageOffset(range.start, totalHeight),
      end: clampPageOffset(range.end, totalHeight),
      priority,
      allowInternalBreaks,
    };
    if (normalized.end - normalized.start <= PAGE_BREAK_EPSILON) return;
    addBreakPoint(normalized.start);
    addBreakPoint(normalized.end);
    protectedRanges.push(normalized);
  };

  const addRangeBoundaries = (range: PageProtectedRange | null) => {
    if (!range) return;
    addBreakPoint(range.start);
    addBreakPoint(range.end);
  };

  flowRoot.querySelectorAll<HTMLElement>('[data-page-section]').forEach((section) => {
    const sectionRange = getElementRange(section, rootTop, totalHeight);
    addRangeBoundaries(sectionRange);

    const header = section.querySelector<HTMLElement>('[data-page-section-header]');
    const firstAtom = section.querySelector<HTMLElement>('[data-page-atom]');
    const firstEntry = section.querySelector<HTMLElement>('[data-page-entry]');
    const firstContent = firstAtom ?? firstEntry;
    const headerRange = header ? getElementRange(header, rootTop, totalHeight) : null;
    const firstContentRange = firstContent ? getElementRange(firstContent, rootTop, totalHeight) : null;
    if (headerRange && firstContentRange) {
      addRange(
        { start: headerRange.start, end: firstContentRange.end, priority: SECTION_INTRO_PRIORITY },
        SECTION_INTRO_PRIORITY,
        isSplittableTextAtom(firstContent),
      );
    } else if (!firstContent) {
      addRange(sectionRange, SECTION_PROTECTION_PRIORITY);
    }
  });

  flowRoot.querySelectorAll<HTMLElement>('[data-page-entry]').forEach((entry) => {
    const entryRange = getElementRange(entry, rootTop, totalHeight);
    addRangeBoundaries(entryRange);

    const firstAtom = entry.querySelector<HTMLElement>('[data-page-atom]');
    const firstAtomRange = firstAtom ? getElementRange(firstAtom, rootTop, totalHeight) : null;
    if (entryRange && firstAtomRange) {
      addRange(
        { start: entryRange.start, end: firstAtomRange.end, priority: ENTRY_INTRO_PRIORITY },
        ENTRY_INTRO_PRIORITY,
        isSplittableTextAtom(firstAtom),
      );
    } else {
      addRange(entryRange, ENTRY_PROTECTION_PRIORITY);
    }
  });

  flowRoot.querySelectorAll<HTMLElement>('[data-page-atom]').forEach((atom) => {
    const atomRange = getElementRange(atom, rootTop, totalHeight);
    const splittable = isSplittableTextAtom(atom);
    addRange(atomRange, ATOM_PROTECTION_PRIORITY, splittable);

    if (splittable || (atomRange && atomRange.end - atomRange.start > pageContentHeight + PAGE_BREAK_EPSILON)) {
      collectTextLineBreakPoints(atom, rootTop, totalHeight).forEach(addInternalBreakPoint);
    }
  });

  flowRoot.querySelectorAll<HTMLElement>('[data-page-keep-with-next]').forEach((element) => {
    const currentRange = getElementRange(element, rootTop, totalHeight);
    if (!currentRange) return;
    let next = element.nextElementSibling as HTMLElement | null;
    while (next && !next.matches('[data-page-atom], [data-page-entry]')) {
      const nested = next.querySelector<HTMLElement>('[data-page-atom], [data-page-entry]');
      if (nested) {
        next = nested;
        break;
      }
      next = next.nextElementSibling as HTMLElement | null;
    }
    const nextRange = next ? getElementRange(next, rootTop, totalHeight) : null;
    if (nextRange) {
      addRange(
        { start: currentRange.start, end: nextRange.end, priority: ENTRY_INTRO_PRIORITY },
        ENTRY_INTRO_PRIORITY,
      );
    }
  });

  return {
    breakPoints: Array.from(breakPoints).sort((a, b) => a - b),
    internalBreakPoints: Array.from(internalBreakPoints).sort((a, b) => a - b),
    protectedRanges,
  };
}
