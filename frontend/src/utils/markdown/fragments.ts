
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
