import React from 'react';

/**
 * Markdown 格式化解析工具
 * 支持 **text** (加粗) / *text* (斜体) / ***text*** (加粗+斜体) / __text__ (下划线) ↔ HTML 标签双向转换
 */

/** 将带标记的原始文本解析为 React 可渲染的片段数组 */
export interface TextFragment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

/**
 * 解析格式化标记：
 * - ***text*** → bold + italic（优先匹配三重星号）
 * - **text**   → bold
 * - *text*     → italic
 * - __text__   → underline
 * - 其余       → 普通文本
 */
export function parseBoldFragments(rawText: string): TextFragment[] {
  const fragments: TextFragment[] = [];
  // 按优先级：*** → ** → * → __ → 普通文本 → 未成对的标记字符。
  // 未组成完整 Markdown 语法的 * / _ 必须作为普通文本保留。
  const tightContent = String.raw`[^\s*_](?:[\s\S]*?[^\s*_])?`;
  const regex = new RegExp(
    String.raw`\*\*\*(${tightContent})\*\*\*` +
      '|' +
      String.raw`\*\*(${tightContent})\*\*` +
      '|' +
      String.raw`\*(${tightContent})\*` +
      '|' +
      String.raw`__(${tightContent})__` +
      '|' +
      String.raw`([^*_]+)` +
      '|' +
      String.raw`([*_])`,
    'g',
  );
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawText)) !== null) {
    if (match[1] !== undefined) {
      // ***text*** → bold + italic
      fragments.push({ text: match[1], bold: true, italic: true, underline: false });
    } else if (match[2] !== undefined) {
      // **text** → bold only
      fragments.push({ text: match[2], bold: true, italic: false, underline: false });
    } else if (match[3] !== undefined) {
      // *text* → italic only
      fragments.push({ text: match[3], bold: false, italic: true, underline: false });
    } else if (match[4] !== undefined) {
      // __text__ → underline
      fragments.push({ text: match[4], bold: false, italic: false, underline: true });
    } else if (match[5] !== undefined) {
      fragments.push({ text: match[5], bold: false, italic: false, underline: false });
    } else if (match[6] !== undefined) {
      fragments.push({ text: match[6], bold: false, italic: false, underline: false });
    }
  }

  if (fragments.length === 0 && rawText) {
    fragments.push({ text: rawText, bold: false, italic: false, underline: false });
  }

  return fragments;
}

// ====== 基于偏移量的精准操作（替代文本搜索，避免重复文字错位） ======

/**
 * 遍历容器 DOM 子树，构建"渲染偏移 → 源文本偏移"映射。
 * 遇到 <strong> 时源文本游标 +2（跳过 **），遇到 <em> 时 +1（跳过 *），
 * 遇到 <u> 时 +2（跳过 __），
 * 嵌套的 <strong><em> 组合使用 3 个星号（***）。
 * 普通文本节点时两游标同步。
 */
export interface OffsetMapping {
  renderedOffset: number;
  sourceOffset: number;
}

export function buildOffsetMap(containerEl: HTMLElement): OffsetMapping[] {
  const mapping: OffsetMapping[] = [];
  let sourceIdx = 0;
  let renderedIdx = 0;

  function walk(node: Node, isTopLevel: boolean) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      for (let i = 0; i < text.length; i++) {
        mapping.push({ renderedOffset: renderedIdx, sourceOffset: sourceIdx });
        renderedIdx++;
        sourceIdx++;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'STRONG') {
        // 检查内部第一个子元素是否为 <em>，若是则说明是 *** 组合标记
        const firstChild = el.firstChild;
        if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE && (firstChild as HTMLElement).tagName === 'EM') {
          // <strong><em>text</em></strong> → ***text***
          // 直接遍历 <em> 内部的子节点，跳过 <em> 标签本身，
          // 避免内层 <em> 重复计算 *（外层 +3 已包含全部 *** 星号）
          sourceIdx += 3; // 跳过开头的 ***
          firstChild.childNodes.forEach(c => walk(c, false));
          sourceIdx += 3; // 跳过结尾的 ***
        } else {
          // <strong>text</strong> → **text**
          sourceIdx += 2; // 跳过开头的 **
          node.childNodes.forEach(c => walk(c, false));
          sourceIdx += 2; // 跳过结尾的 **
        }
      } else if (el.tagName === 'EM') {
        // 单独的 <em>text</em> → *text*（不在 <strong> 内部的）
        sourceIdx += 1; // 跳过开头的 *
        node.childNodes.forEach(c => walk(c, false));
        sourceIdx += 1; // 跳过结尾的 *
      } else if (el.tagName === 'U') {
        // <u>text</u> → __text__
        sourceIdx += 2; // 跳过开头的 __
        node.childNodes.forEach(c => walk(c, false));
        sourceIdx += 2; // 跳过结尾的 __
      } else if ((el.tagName === 'LI' || el.tagName === 'P') && isTopLevel) {
        // <li>/<p> 之间的换行符：源文本每行之间有一个 '\n'，
        // 但 DOM 中元素之间没有对应文本节点，需手动补 1
        node.childNodes.forEach(c => walk(c, false));
        sourceIdx += 1; // 补上源文本中的 '\n'
      } else {
        node.childNodes.forEach(c => walk(c, false));
      }
    }
  }

  containerEl.childNodes.forEach(c => walk(c, true));
  // 去掉最后一个 <li>/<p> 后多余的 '\n' 偏移
  if (sourceIdx > 0 && (containerEl.lastElementChild?.tagName === 'LI' || containerEl.lastElementChild?.tagName === 'P')) {
    sourceIdx -= 1;
  }
  return mapping;
}

/**
 * 计算 DOM 节点+偏移量在容器渲染文本中的字符偏移。
 * 遍历容器内所有文本节点累加字符数直至命中目标。
 */
export function getRenderedOffset(
  containerEl: HTMLElement,
  targetNode: Node,
  targetOffset: number
): number {
  let offset = 0;
  let found = false;

  function walk(node: Node): void {
    if (found) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (node === targetNode) {
        offset += Math.min(targetOffset, text.length);
        found = true;
        return;
      }
      offset += text.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.childNodes.forEach(walk);
    }
  }

  containerEl.childNodes.forEach(walk);
  return offset;
}

/** 检查源文本 [start, end) 区间是否已被 ** 包裹 */
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
export function toggleOrderedListInRange(text: string, start: number, end: number): string {
  if (start < 0 || end > text.length || start > end) return text;

  // 扩展到整行边界
  let lineStart = start;
  while (lineStart > 0 && text[lineStart - 1] !== '\n') lineStart--;
  let lineEnd = end;
  while (lineEnd < text.length && text[lineEnd] !== '\n') lineEnd++;

  const prefix = text.substring(0, lineStart);
  const suffix = text.substring(lineEnd);
  const middle = text.substring(lineStart, lineEnd);
  const lines = middle.split('\n');

  // 判断是否所有非空行都已有有序列表前缀
  const allNumbered = lines.every((l) => /^\d+\.\s/.test(l));

  if (allNumbered) {
    // 移除前缀
    const newLines = lines.map((l) => l.replace(/^\d+\.\s*/, ''));
    return prefix + newLines.join('\n') + suffix;
  }

  // 添加有序列表前缀前，先剥离已有的无序列表前缀（避免格式重叠）
  const stripped = lines.map((l) => l.replace(/^[-*]\s*/, ''));
  const newLines = stripped.map((l, i) => `${i + 1}. ${l}`);
  return prefix + newLines.join('\n') + suffix;
}

/**
 * 在全文 text 的 [start, end) 范围内按行切换无序列表。
 * 将 start/end 扩展到整行边界，对选区内所有行添加/移除 `- ` 或 `* ` 前缀。
 */
export function toggleUnorderedListInRange(text: string, start: number, end: number): string {
  if (start < 0 || end > text.length || start > end) return text;

  // 扩展到整行边界
  let lineStart = start;
  while (lineStart > 0 && text[lineStart - 1] !== '\n') lineStart--;
  let lineEnd = end;
  while (lineEnd < text.length && text[lineEnd] !== '\n') lineEnd++;

  const prefix = text.substring(0, lineStart);
  const suffix = text.substring(lineEnd);
  const middle = text.substring(lineStart, lineEnd);
  const lines = middle.split('\n');

  // 判断是否所有非空行都已有无序列表前缀
  const allBulleted = lines.every((l) => /^[-*]\s/.test(l));

  if (allBulleted) {
    // 移除前缀
    const newLines = lines.map((l) => l.replace(/^[-*]\s*/, ''));
    return prefix + newLines.join('\n') + suffix;
  }

  // 添加无序列表前缀前，先剥离已有的有序列表前缀（避免格式重叠）
  const stripped = lines.map((l) => l.replace(/^\d+\.\s*/, ''));
  const newLines = stripped.map((l) => `- ${l}`);
  return prefix + newLines.join('\n') + suffix;
}

// ====== Markdown ↔ editable HTML ======

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(text: string): string {
  return escapeHtml(text).replace(/`/g, '&#96;');
}

function isSafeLinkUrl(rawUrl: string): boolean {
  const value = rawUrl.trim();
  if (!value || /[\u0000-\u001F\u007F\s]/.test(value)) return false; // eslint-disable-line no-control-regex
  try {
    const parsed = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
}

function renderInlineHtml(text: string): string {
  if (!text) return '';

  const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
  let html = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = LINK_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      html += renderBoldItalicHtml(text.slice(lastIndex, match.index));
    }
    const href = match[2].trim();
    if (isSafeLinkUrl(href)) {
      html += `<a href="${escapeAttribute(href)}" class="text-blue-500 underline" target="_blank" rel="noopener noreferrer">${renderBoldItalicHtml(match[1])}</a>`;
    } else {
      html += renderBoldItalicHtml(match[1]);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    html += renderBoldItalicHtml(text.slice(lastIndex));
  }

  return html;
}

function renderBoldItalicHtml(text: string): string {
  return parseBoldFragments(text)
    .map((fragment) => {
      let html = escapeHtml(fragment.text);
      if (fragment.underline) html = `<u>${html}</u>`;
      if (fragment.bold && fragment.italic) {
        return `<strong><em>${html}</em></strong>`;
      }
      if (fragment.bold) return `<strong>${html}</strong>`;
      if (fragment.italic) return `<em>${html}</em>`;
      return html;
    })
    .join('');
}

function wrapMarkdownLines(content: string, marker: string): string {
  return content
    .split('\n')
    .map((line) => (line ? `${marker}${line}${marker}` : line))
    .join('\n');
}

function normalizeMultilineInlineMarkdown(block: string): string {
  let normalized = block;
  normalized = normalized.replace(/\*\*\*([^\s*](?:[\s\S]*?[^\s*])?)\*\*\*/g, (match, content: string) =>
    content.includes('\n') ? wrapMarkdownLines(content, '***') : match
  );
  normalized = normalized.replace(/\*\*([^\s*](?:[\s\S]*?[^\s*])?)\*\*/g, (match, content: string) =>
    content.includes('\n') ? wrapMarkdownLines(content, '**') : match
  );
  normalized = normalized.replace(/__([^_\s](?:[\s\S]*?[^_\s])?)__/g, (match, content: string) =>
    content.includes('\n') ? wrapMarkdownLines(content, '__') : match
  );
  normalized = normalized.replace(/(^|[^*])\*([^\s*](?:[\s\S]*?[^\s*])?)\*(?!\*)/g, (match, before: string, content: string) =>
    content.includes('\n') ? `${before}${wrapMarkdownLines(content, '*')}` : match
  );
  return normalized;
}

/**
 * Convert the supported Markdown subset into editable HTML for the rich-text mode.
 * Keep this in sync with renderMarkdownContent so rich mode still looks like preview.
 */
export function markdownToEditableHtml(rawMarkdown: string): string {
  if (!rawMarkdown?.trim()) return '';

  const blocks = rawMarkdown.split(/\n{2,}/);
  const elements: string[] = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = normalizeMultilineInlineMarkdown(blocks[bi].trim());
    if (!block) continue;

    const lines = block.split('\n');
    const headingMatch = block.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const tag = HEADING_TAG[level] || 'h4';
      elements.push(
        `<${tag} class="${HEADING_CLASS[tag] || ''}" data-section-field="markdown-heading" data-page-atom="true" data-page-keep-with-next="true">${renderInlineHtml(headingMatch[2])}</${tag}>`,
      );
      continue;
    }

    const allOrdered = lines.length > 0 && lines.every((l) => /^\d+\.\s/.test(l));
    if (allOrdered) {
      elements.push(
        `<ol class="list-decimal list-inside space-y-0.5 pl-1" data-section-field="markdown-ol">${lines
          .map((line) => `<li class="text-sm text-gray-700" data-page-atom="true">${renderInlineHtml(line.replace(/^\d+\.\s*/, ''))}</li>`)
          .join('')}</ol>`,
      );
      continue;
    }

    const allBulleted = lines.length > 0 && lines.every((l) => /^[-*]\s/.test(l));
    if (allBulleted) {
      elements.push(
        `<ul class="list-disc list-inside space-y-0.5 pl-1" data-section-field="markdown-ul">${lines
          .map((line) => `<li class="text-sm text-gray-700" data-page-atom="true">${renderInlineHtml(line.replace(/^[-*]\s*/, ''))}</li>`)
          .join('')}</ul>`,
      );
      continue;
    }

    elements.push(
      `<p class="text-sm text-gray-700" data-section-field="markdown-p" data-page-atom="true" data-page-splittable="true">${lines
        .map((line) => renderInlineHtml(line))
        .join('<br>')}</p>`,
    );
  }

  return elements.join('');
}

function textNodeToMarkdown(node: Node): string {
  return (node.textContent || '').replace(/\u00a0/g, ' ');
}

function inlineChildrenToMarkdown(node: Node): string {
  return Array.from(node.childNodes).map(inlineNodeToMarkdown).join('');
}

function wrapInlineMarkdownLines(content: string, marker: string): string {
  return content
    .split('\n')
    .map((line) => (line ? `${marker}${line}${marker}` : line))
    .join('\n');
}

function inlineNodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return textNodeToMarkdown(node);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tagName = el.tagName.toUpperCase();

  if (tagName === 'BR') return '\n';

  const content = inlineChildrenToMarkdown(el);
  if (!content) return '';

  if (tagName === 'STRONG' || tagName === 'B') return wrapInlineMarkdownLines(content, '**');
  if (tagName === 'EM' || tagName === 'I') return wrapInlineMarkdownLines(content, '*');
  if (tagName === 'U') return wrapInlineMarkdownLines(content, '__');

  if (tagName === 'A') {
    const href = (el.getAttribute('href') || '').trim();
    if (href && !isSafeLinkUrl(href)) return content;
    return href ? `[${content}](${href})` : content;
  }

  return content;
}

function blockNodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return textNodeToMarkdown(node).trim();
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tagName = el.tagName.toUpperCase();

  if (tagName === 'BR') return '';

  if (tagName === 'UL') {
    return Array.from(el.children)
      .filter((child) => child.tagName.toUpperCase() === 'LI')
      .map((li) => `- ${inlineChildrenToMarkdown(li).trim()}`)
      .join('\n');
  }

  if (tagName === 'OL') {
    return Array.from(el.children)
      .filter((child) => child.tagName.toUpperCase() === 'LI')
      .map((li, index) => `${index + 1}. ${inlineChildrenToMarkdown(li).trim()}`)
      .join('\n');
  }

  if (/^H[1-6]$/.test(tagName)) {
    const marker = tagName === 'H2' ? '#' : tagName === 'H3' ? '##' : '###';
    return `${marker} ${inlineChildrenToMarkdown(el).trim()}`;
  }

  if (tagName === 'LI') {
    return `- ${inlineChildrenToMarkdown(el).trim()}`;
  }

  if (['STRONG', 'B', 'EM', 'I', 'U', 'A', 'SPAN'].includes(tagName)) {
    return inlineNodeToMarkdown(el).trim();
  }

  if (tagName === 'P' || tagName === 'DIV') {
    return inlineChildrenToMarkdown(el).trim();
  }

  return inlineChildrenToMarkdown(el).trim();
}

/**
 * Convert the contenteditable DOM back into the Markdown subset stored by resume data.
 */
export function editableHtmlToMarkdown(root: HTMLElement): string {
  const blocks = Array.from(root.childNodes)
    .map(blockNodeToMarkdown)
    .map((block) => block.replace(/\n{3,}/g, '\n\n').trim())
    .filter(Boolean);

  return blocks.join('\n\n');
}

// ====== Markdown → React 渲染 ======

/** 渲染行内文本：加粗、斜体、链接 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // 先处理链接 [text](url)，再处理 ** 和 *
  const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = LINK_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderBoldItalic(text.slice(lastIndex, match.index), key++));
    }
    const href = match[2].trim();
    if (isSafeLinkUrl(href)) {
      parts.push(
        React.createElement('a', {
          key: key++,
          href,
          className: 'text-blue-500 underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        }, match[1]),
      );
    } else {
      parts.push(renderBoldItalic(match[1], key++));
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(renderBoldItalic(text.slice(lastIndex), key++));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];
  return React.createElement(React.Fragment, null, ...parts);
}

/** 渲染加粗/斜体/下划线片段（复用 parseBoldFragments） */
function renderBoldItalic(text: string, _baseKey: number): React.ReactNode {
  const fragments = parseBoldFragments(text);
  if (fragments.length === 1 && !fragments[0].bold && !fragments[0].italic && !fragments[0].underline) {
    return fragments[0].text;
  }
  return React.createElement(
    React.Fragment,
    null,
    ...fragments.map((f, _i) => {
      let el: React.ReactNode = f.text;
      // 内层: 下划线 <u>
      if (f.underline) {
        el = React.createElement('u', null, el);
      }
      // 外层: 加粗 / 斜体
      if (f.bold && f.italic) {
        el = React.createElement('strong', null, React.createElement('em', null, el));
      } else if (f.bold) {
        el = React.createElement('strong', null, el);
      } else if (f.italic) {
        el = React.createElement('em', null, el);
      }
      return el as React.ReactNode;
    }),
  );
}

const HEADING_CLASS: Record<string, string> = {
  h2: 'text-[15px] font-bold text-gray-900 mb-2',
  h3: 'text-[14px] font-semibold text-gray-800 mb-1.5',
  h4: 'text-[13px] font-semibold text-gray-700 mb-1',
};

const HEADING_TAG: Record<number, string> = { 1: 'h2', 2: 'h3', 3: 'h4' };

/**
 * 将原始 Markdown 文本渲染为 React 节点数组。
 * 支持：标题(# ## ###)、加粗(**)、斜体(*)、无序列表(- *)、有序列表(1.)、链接([]())、换行。
 */
export function renderMarkdownContent(rawMarkdown: string): React.ReactNode {
  if (!rawMarkdown?.trim()) return null;

  // 按双换行切分为块（block）
  const blocks = rawMarkdown.split(/\n{2,}/);
  const elements: React.ReactNode[] = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi].trim();
    if (!block) continue;

    const lines = block.split('\n');

    // 标题 # / ## / ###
    const headingMatch = block.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length; // 1, 2, 3
      const content = headingMatch[2];
      const tag = HEADING_TAG[level] || 'h4';
      elements.push(
        React.createElement(
          tag,
          {
            key: `h-${bi}`,
            className: HEADING_CLASS[tag] || '',
            'data-section-field': 'markdown-heading',
            'data-page-atom': true,
            'data-page-keep-with-next': true,
          },
          renderInline(content),
        ),
      );
      continue;
    }

    // 有序列表：非空行均匹配 "N. "
    const allOrdered = lines.length > 0 && lines.every((l) => /^\d+\.\s/.test(l));
    if (allOrdered) {
      elements.push(
        React.createElement(
          'ol',
          { key: `ol-${bi}`, className: 'list-decimal list-inside space-y-0.5 pl-1', 'data-section-field': 'markdown-ol' },
          lines.map((line, li) =>
            React.createElement(
              'li',
              { key: li, className: 'text-sm text-gray-700', 'data-page-atom': true },
              renderInline(line.replace(/^\d+\.\s*/, '')),
            ),
          ),
        ),
      );
      continue;
    }

    // 无序列表：非空行均匹配 "- " 或 "* "
    const allBulleted = lines.length > 0 && lines.every((l) => /^[-*]\s/.test(l));
    if (allBulleted) {
      elements.push(
        React.createElement(
          'ul',
          { key: `ul-${bi}`, className: 'list-disc list-inside space-y-0.5 pl-1', 'data-section-field': 'markdown-ul' },
          lines.map((line, li) =>
            React.createElement(
              'li',
              { key: li, className: 'text-sm text-gray-700', 'data-page-atom': true },
              renderInline(line.replace(/^[-*]\s*/, '')),
            ),
          ),
        ),
      );
      continue;
    }

    // 普通段落：行内换行用 <br/>
    elements.push(
      React.createElement(
        'p',
        { key: `p-${bi}`, className: 'text-sm text-gray-700', 'data-section-field': 'markdown-p', 'data-page-atom': true, 'data-page-splittable': true },
        lines.map((line, li) => {
          const nodes: React.ReactNode[] = [];
          if (li > 0) nodes.push(React.createElement('br', { key: `br-${bi}-${li}` }));
          nodes.push(renderInline(line));
          return React.createElement(React.Fragment, { key: `${bi}-${li}` }, ...nodes);
        }),
      ),
    );
  }

  if (elements.length === 0) return null;
  if (elements.length === 1) return elements[0];
  return React.createElement(React.Fragment, null, ...elements);
}
