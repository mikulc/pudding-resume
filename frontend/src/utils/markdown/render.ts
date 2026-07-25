import { parseBoldFragments } from './fragments';
import { isSafeLinkUrl } from './editableHtml';
import { HEADING_CLASS, HEADING_TAG } from './headings';

import React from 'react';

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
