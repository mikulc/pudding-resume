export function isRangeBold(sourceText: string, start: number, end: number): boolean {
  return (
    start >= 2 &&
    end + 2 <= sourceText.length &&
    sourceText.substring(start - 2, start) === '**' &&
    sourceText.substring(end, end + 2) === '**'
  );
}

/** 在源文本精确偏移量处插入 ** 加粗标记 */
export function boldAtPosition(sourceText: string, start: number, end: number): string {
  if (start < 0 || end > sourceText.length || start >= end) return sourceText;
  return (
    sourceText.substring(0, start) +
    '**' +
    sourceText.substring(start, end) +
    '**' +
    sourceText.substring(end)
  );
}

/** 在源文本精确偏移量处移除 ** 加粗标记 */
export function unboldAtPosition(sourceText: string, start: number, end: number): string {
  if (start < 2 || end + 2 > sourceText.length) return sourceText;
  return (
    sourceText.substring(0, start - 2) +
    sourceText.substring(start, end) +
    sourceText.substring(end + 2)
  );
}

// ====== 逐行标记（用于跨行选中时按行包裹标记） ======

/** 检查单行是否被指定标记包裹（如 **text** 或 *text*） */
function isLineWrapped(line: string, marker: string): boolean {
  const len = marker.length;
  if (line.length < len * 2 || !line.startsWith(marker) || !line.endsWith(marker)) {
    return false;
  }

  if (marker === '*') {
    const startsAsBoldOnly = line.startsWith('**') && !line.startsWith('***');
    const endsAsBoldOnly = line.endsWith('**') && !line.endsWith('***');
    return !startsAsBoldOnly && !endsAsBoldOnly;
  }

  return true;
}

interface LineSelectionRange {
  lineStart: number;
  lineEnd: number;
  selectionStart: number;
  selectionEnd: number;
  line: string;
}

interface TextChange {
  start: number;
  end: number;
  text: string;
}

function getSelectedLineRanges(sourceText: string, start: number, end: number): LineSelectionRange[] {
  const ranges: LineSelectionRange[] = [];
  let lineStart = start;

  while (lineStart > 0 && sourceText[lineStart - 1] !== '\n') {
    lineStart--;
  }

  while (lineStart <= end && lineStart < sourceText.length) {
    const nextLineBreak = sourceText.indexOf('\n', lineStart);
    const lineEnd = nextLineBreak === -1 ? sourceText.length : nextLineBreak;
    const selectionStart = Math.max(start, lineStart);
    const selectionEnd = Math.min(end, lineEnd);

    if (selectionStart < selectionEnd) {
      ranges.push({
        lineStart,
        lineEnd,
        selectionStart,
        selectionEnd,
        line: sourceText.substring(lineStart, lineEnd),
      });
    }

    if (nextLineBreak === -1 || lineEnd >= end) {
      break;
    }

    lineStart = nextLineBreak + 1;
  }

  return ranges;
}

function getVisibleLineBounds(lineStart: number, lineEnd: number, line: string) {
  const wrappers = ['***', '**', '*', '__'];
  const wrapper = wrappers.find(
    (item) => line.length >= item.length * 2 && line.startsWith(item) && line.endsWith(item)
  );

  if (!wrapper) {
    return { start: lineStart, end: lineEnd };
  }

  return {
    start: lineStart + wrapper.length,
    end: lineEnd - wrapper.length,
  };
}

function getLineMarkerRemovalChanges(
  sourceText: string,
  range: LineSelectionRange,
  marker: string
): TextChange[] | null {
  const markerLength = marker.length;
  const selected = sourceText.substring(range.selectionStart, range.selectionEnd);

  if (isLineWrapped(selected, marker)) {
    return [
      { start: range.selectionStart, end: range.selectionStart + markerLength, text: '' },
      { start: range.selectionEnd - markerLength, end: range.selectionEnd, text: '' },
    ];
  }

  if (
    range.selectionStart >= markerLength &&
    range.selectionEnd + markerLength <= sourceText.length &&
    sourceText.substring(range.selectionStart - markerLength, range.selectionStart) === marker &&
    sourceText.substring(range.selectionEnd, range.selectionEnd + markerLength) === marker
  ) {
    return [
      { start: range.selectionStart - markerLength, end: range.selectionStart, text: '' },
      { start: range.selectionEnd, end: range.selectionEnd + markerLength, text: '' },
    ];
  }

  if (isLineWrapped(range.line, marker)) {
    const visibleBounds = getVisibleLineBounds(range.lineStart, range.lineEnd, range.line);
    if (range.selectionStart <= visibleBounds.start && range.selectionEnd >= visibleBounds.end) {
      return [
        { start: range.lineStart, end: range.lineStart + markerLength, text: '' },
        { start: range.lineEnd - markerLength, end: range.lineEnd, text: '' },
      ];
    }
  }

  return null;
}

function isRangeCoveredByLineMarker(
  range: LineSelectionRange,
  marker: string
): boolean {
  if (!isLineWrapped(range.line, marker)) {
    return false;
  }

  const visibleBounds = getVisibleLineBounds(range.lineStart, range.lineEnd, range.line);
  return range.selectionStart >= visibleBounds.start && range.selectionEnd <= visibleBounds.end;
}

function getLineMarkerInsertionBounds(range: LineSelectionRange) {
  const visibleBounds = getVisibleLineBounds(range.lineStart, range.lineEnd, range.line);

  if (range.selectionStart <= visibleBounds.start && range.selectionEnd >= visibleBounds.end) {
    return visibleBounds;
  }

  return {
    start: range.selectionStart,
    end: range.selectionEnd,
  };
}

function applyTextChanges(sourceText: string, changes: TextChange[]): string {
  return [...changes]
    .sort((a, b) => b.start - a.start || b.end - a.end)
    .reduce(
      (text, change) =>
        text.substring(0, change.start) + change.text + text.substring(change.end),
      sourceText
    );
}

/**
 * 逐行切换标记：当选区跨行时，对每行分别添加/移除标记，
 * 避免跨行包裹产生无效 Markdown（如 **line1\nline2**）。
 */
function toggleMarkPerLine(
  sourceText: string,
  start: number,
  end: number,
  marker: string
): string {
  if (start < 0 || end > sourceText.length || start >= end) return sourceText;

  const ranges = getSelectedLineRanges(sourceText, start, end);
  if (ranges.length === 0) return sourceText;

  const removalChangesByLine = ranges.map((range) =>
    getLineMarkerRemovalChanges(sourceText, range, marker)
  );

  if (removalChangesByLine.every(Boolean)) {
    return applyTextChanges(sourceText, removalChangesByLine.flatMap((changes) => changes || []));
  }

  const addChanges: TextChange[] = [];
  ranges.forEach((range, index) => {
    if (removalChangesByLine[index] || isRangeCoveredByLineMarker(range, marker)) {
      return;
    }

    const insertionBounds = getLineMarkerInsertionBounds(range);
    addChanges.push(
      { start: insertionBounds.end, end: insertionBounds.end, text: marker },
      { start: insertionBounds.start, end: insertionBounds.start, text: marker }
    );
  });

  return addChanges.length > 0 ? applyTextChanges(sourceText, addChanges) : sourceText;
}

/** 基于偏移量切换加粗状态 */
export function toggleBoldAtPosition(
  sourceText: string,
  start: number,
  end: number
): string {
  // 选区跨行 → 逐行切换加粗
  const selected = sourceText.substring(start, end);
  if (selected.includes('\n')) {
    return toggleMarkPerLine(sourceText, start, end, '**');
  }
  if (isLineWrapped(selected, '**')) {
    return sourceText.substring(0, start) + selected.slice(2, -2) + sourceText.substring(end);
  }
  // 单行 → 原有逻辑
  if (isRangeBold(sourceText, start, end)) {
    return unboldAtPosition(sourceText, start, end);
  }
  return boldAtPosition(sourceText, start, end);
}

// ====== 斜体操作（基于偏移量，与加粗逻辑一致） ======

/**
 * 检查源文本 [start, end) 区间是否已被 * 包裹（斜体标记）
 * 需要排除 **（加粗）和 ***（加粗+斜体组合）的误判：
 * - *text*    → true（单星号包裹，纯斜体）
 * - **text**  → false（双星号包裹，纯加粗）
 * - ***text*** → true（三星号包裹，加粗+斜体组合，内层 * 也算斜体标记）
 */
export function isRangeItalic(sourceText: string, start: number, end: number): boolean {
  if (start < 1 || end + 1 > sourceText.length) return false;
  if (sourceText[start - 1] !== '*' || sourceText[end] !== '*') return false;

  // 左侧：检查 * 是否为独立斜体标记（非纯加粗 ** 的组成部分）
  const leftIsBoldStart =
    start >= 2 &&
    sourceText[start - 2] === '*' &&
    sourceText[start - 1] === '*';
  // 如果左侧形成 ** 且不是 *** 的一部分，则不是斜体
  if (leftIsBoldStart && (start < 3 || sourceText[start - 3] !== '*')) return false;

  // 右侧：检查 * 是否为独立斜体标记（非纯加粗 ** 的组成部分）
  const rightIsBoldEnd =
    end + 2 <= sourceText.length &&
    sourceText[end] === '*' &&
    sourceText[end + 1] === '*';
  if (rightIsBoldEnd && (end + 3 > sourceText.length || sourceText[end + 2] !== '*')) return false;

  return true;
}

/** 在源文本精确偏移量处插入 * 斜体标记 */
export function italicAtPosition(sourceText: string, start: number, end: number): string {
  if (start < 0 || end > sourceText.length || start >= end) return sourceText;

  return (
    sourceText.substring(0, start) +
    '*' +
    sourceText.substring(start, end) +
    '*' +
    sourceText.substring(end)
  );
}

/**
 * 在源文本精确偏移量处移除 * 斜体标记。
 */
export function unitalicAtPosition(sourceText: string, start: number, end: number): string {
  if (start < 1 || end + 1 > sourceText.length) return sourceText;

  return (
    sourceText.substring(0, start - 1) +
    sourceText.substring(start, end) +
    sourceText.substring(end + 1)
  );
}

/** 基于偏移量切换斜体状态 */
export function toggleItalicAtPosition(
  sourceText: string,
  start: number,
  end: number
): string {
  // 选区跨行 → 逐行切换斜体
  const selected = sourceText.substring(start, end);
  if (selected.includes('\n')) {
    return toggleMarkPerLine(sourceText, start, end, '*');
  }
  if (selected.startsWith('***') && selected.endsWith('***') && selected.length >= 6) {
    return sourceText.substring(0, start) + `**${selected.slice(3, -3)}**` + sourceText.substring(end);
  }
  if (selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**') && !selected.endsWith('**')) {
    return sourceText.substring(0, start) + selected.slice(1, -1) + sourceText.substring(end);
  }
  // 单行 → 原有逻辑
  if (isRangeItalic(sourceText, start, end)) {
    return unitalicAtPosition(sourceText, start, end);
  }
  return italicAtPosition(sourceText, start, end);
}

// ====== 下划线操作（基于偏移量，使用 __ 标记） ======

/**
 * 检查源文本 [start, end) 区间是否已被 __ 包裹（下划线标记）
 */
export function isRangeUnderline(sourceText: string, start: number, end: number): boolean {
  return (
    start >= 2 &&
    end + 2 <= sourceText.length &&
    sourceText.substring(start - 2, start) === '__' &&
    sourceText.substring(end, end + 2) === '__'
  );
}

/** 在源文本精确偏移量处插入 __ 下划线标记 */
export function underlineAtPosition(sourceText: string, start: number, end: number): string {
  if (start < 0 || end > sourceText.length || start >= end) return sourceText;
  return (
    sourceText.substring(0, start) +
    '__' +
    sourceText.substring(start, end) +
    '__' +
    sourceText.substring(end)
  );
}

/** 在源文本精确偏移量处移除 __ 下划线标记 */
export function ununderlineAtPosition(sourceText: string, start: number, end: number): string {
  if (start < 2 || end + 2 > sourceText.length) return sourceText;
  return (
    sourceText.substring(0, start - 2) +
    sourceText.substring(start, end) +
    sourceText.substring(end + 2)
  );
}

/** 基于偏移量切换下划线状态 */
export function toggleUnderlineAtPosition(
  sourceText: string,
  start: number,
  end: number
): string {
  // 选区跨行 → 逐行切换下划线
  const selected = sourceText.substring(start, end);
  if (selected.includes('\n')) {
    return toggleMarkPerLine(sourceText, start, end, '__');
  }
  if (isLineWrapped(selected, '__')) {
    return sourceText.substring(0, start) + selected.slice(2, -2) + sourceText.substring(end);
  }
  // 单行 → 原有逻辑
  if (isRangeUnderline(sourceText, start, end)) {
    return ununderlineAtPosition(sourceText, start, end);
  }
  return underlineAtPosition(sourceText, start, end);
}

// ====== 清除格式 ======

const INLINE_FORMAT_TAGS = 'strong|b|em|i|u|s|del|strike|code|a|span|font|mark';

function hasTightContent(value: string): boolean {
  return value.length > 0 && value.trim() === value;
}

export function stripInlineMarkdownFormatting(text: string): string {
  let current = text;
  let previous = '';

  while (current !== previous) {
    previous = current;
    current = current
      .replace(/!\[([^\]]*)\]\(([^)\n]*)\)/g, (_match, alt: string) =>
        stripInlineMarkdownFormatting(alt)
      )
      .replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, (_match, label: string) =>
        stripInlineMarkdownFormatting(label)
      )
      .replace(new RegExp(`<\\/?(?:${INLINE_FORMAT_TAGS})(?:\\s+[^>]*)?>`, 'gi'), '')
      .replace(/`([^`\n]+)`/g, (_match, content: string) => content)
      .replace(/~~([^~\n](?:[\s\S]*?[^~\n])?)~~/g, (_match, content: string) =>
        stripInlineMarkdownFormatting(content)
      )
      .replace(/__([^_\n](?:[\s\S]*?[^_\n])?)__/g, (_match, content: string) =>
        stripInlineMarkdownFormatting(content)
      );

    current = current
      .replace(/\*\*\*([^\s*](?:[\s\S]*?[^\s*])?)\*\*\*/g, (_match, content: string) =>
        stripInlineMarkdownFormatting(content)
      )
      .replace(/\*\*([^\s*](?:[\s\S]*?[^\s*])?)\*\*/g, (_match, content: string) =>
        stripInlineMarkdownFormatting(content)
      )
      .replace(/(^|[^*])\*([^\s*](?:[\s\S]*?[^\s*])?)\*(?!\*)/g, (_match, before: string, content: string) =>
        `${before}${stripInlineMarkdownFormatting(content)}`
      );
  }

  return current;
}

function stripBoundaryMarkers(
  prefix: string,
  middle: string,
  suffix: string
): { prefix: string; suffix: string } {
  let nextPrefix = prefix;
  let nextSuffix = suffix;
  let changed = true;

  while (changed) {
    changed = false;

    for (const marker of ['***', '**', '__', '~~', '*', '`']) {
      if (hasTightContent(middle) && nextPrefix.endsWith(marker) && nextSuffix.startsWith(marker)) {
        nextPrefix = nextPrefix.slice(0, -marker.length);
        nextSuffix = nextSuffix.slice(marker.length);
        changed = true;
        break;
      }
    }
  }

  return { prefix: nextPrefix, suffix: nextSuffix };
}

function stripBoundaryLink(
  prefix: string,
  suffix: string
): { prefix: string; suffix: string } {
  const linkSuffixMatch = suffix.match(/^\]\([^)\n]*\)/);
  if (!linkSuffixMatch) {
    return { prefix, suffix };
  }

  if (prefix.endsWith('![')) {
    return {
      prefix: prefix.slice(0, -2),
      suffix: suffix.slice(linkSuffixMatch[0].length),
    };
  }

  if (prefix.endsWith('[')) {
    return {
      prefix: prefix.slice(0, -1),
      suffix: suffix.slice(linkSuffixMatch[0].length),
    };
  }

  return { prefix, suffix };
}

function stripBoundaryHtmlTags(
  prefix: string,
  suffix: string
): { prefix: string; suffix: string } {
  const openTagMatch = prefix.match(new RegExp(`<(${INLINE_FORMAT_TAGS})(?:\\s+[^>]*)?>$`, 'i'));
  if (!openTagMatch) {
    return { prefix, suffix };
  }

  const closeTag = new RegExp(`^<\\/${openTagMatch[1]}>`, 'i');
  const closeTagMatch = suffix.match(closeTag);
  if (!closeTagMatch) {
    return { prefix, suffix };
  }

  return {
    prefix: prefix.slice(0, -openTagMatch[0].length),
    suffix: suffix.slice(closeTagMatch[0].length),
  };
}

/**
 * 清除选中区域内的内联格式标记，并保留文字、换行与列表前缀。
 */
export function clearFormatAtPosition(
  sourceText: string,
  start: number,
  end: number
): string {
  if (start < 0 || end > sourceText.length || start >= end) return sourceText;

  let prefix = sourceText.substring(0, start);
  const middle = stripInlineMarkdownFormatting(sourceText.substring(start, end));
  let suffix = sourceText.substring(end);

  let changed = true;
  while (changed) {
    const beforePrefix = prefix;
    const beforeSuffix = suffix;

    ({ prefix, suffix } = stripBoundaryMarkers(prefix, middle, suffix));
    ({ prefix, suffix } = stripBoundaryLink(prefix, suffix));
    ({ prefix, suffix } = stripBoundaryHtmlTags(prefix, suffix));

    changed = beforePrefix !== prefix || beforeSuffix !== suffix;
  }

  return prefix + middle + suffix;
}

// ====== 列表操作 ======

/**
 * 在全文 text 的 [start, end) 范围内按行切换有序列表。
 * 将 start/end 扩展到整行边界，对选区内所有行添加/移除 `N. ` 前缀。
 */
