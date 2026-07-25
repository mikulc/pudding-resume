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

