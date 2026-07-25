import { parseBoldFragments } from './fragments';
import { HEADING_CLASS, HEADING_TAG } from './headings';

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

export function isSafeLinkUrl(rawUrl: string): boolean {
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
