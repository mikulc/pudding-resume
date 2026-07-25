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
