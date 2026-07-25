interface PdfTextContentLike {
  items: unknown[];
}

interface PdfTextItemLike {
  str: string;
  transform?: number[];
  width?: number;
  height?: number;
}

interface PositionedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextLine {
  y: number;
  height: number;
  items: PositionedTextItem[];
}

function isPdfTextItem(item: unknown): item is PdfTextItemLike {
  return !!item && typeof item === 'object' && 'str' in item && typeof (item as { str: unknown }).str === 'string';
}

function getPdfItemPosition(item: PdfTextItemLike): PositionedTextItem | null {
  const text = item.str.replace(/\s+/g, ' ');
  if (!text.trim()) return null;

  const transform = Array.isArray(item.transform) ? item.transform : [];
  const x = typeof transform[4] === 'number' ? transform[4] : 0;
  const y = typeof transform[5] === 'number' ? transform[5] : 0;
  const transformHeight = typeof transform[3] === 'number' ? Math.abs(transform[3]) : 0;
  const height = Math.max(item.height || transformHeight || 1, 1);

  return {
    text,
    x,
    y,
    width: Math.max(item.width || 0, 0),
    height,
  };
}

function shouldInsertSpace(previous: PositionedTextItem, current: PositionedTextItem): boolean {
  if (/\s$/.test(previous.text) || /^\s/.test(current.text)) return false;

  const previousEnd = previous.x + previous.width;
  const gap = current.x - previousEnd;
  if (gap <= 0) return false;

  const previousCharWidth = previous.width > 0 ? previous.width / Math.max(previous.text.length, 1) : 0;
  const currentCharWidth = current.width > 0 ? current.width / Math.max(current.text.length, 1) : 0;
  const averageCharWidth = Math.max(previousCharWidth, currentCharWidth, 4);

  return gap > averageCharWidth * 0.45;
}

function renderTextLine(line: TextLine): string {
  const items = [...line.items].sort((a, b) => a.x - b.x);
  let text = '';

  items.forEach((item, index) => {
    if (index > 0 && shouldInsertSpace(items[index - 1], item)) {
      text += ' ';
    }
    text += item.text;
  });

  return text.trim();
}

/**
 * Rebuild visual line breaks from pdf.js text items.
 *
 * pdf.js exposes positioned text fragments rather than paragraphs. Joining
 * every fragment with spaces destroys resume bullets and section line breaks,
 * so we group fragments by their y coordinate and then sort each line by x.
 */
export function extractPdfPageText(textContent: PdfTextContentLike): string {
  const positionedItems = textContent.items
    .map((item) => (isPdfTextItem(item) ? getPdfItemPosition(item) : null))
    .filter((item): item is PositionedTextItem => item !== null)
    .sort((a, b) => (Math.abs(b.y - a.y) > 0.5 ? b.y - a.y : a.x - b.x));

  const lines: TextLine[] = [];

  positionedItems.forEach((item) => {
    const line = lines.find((candidate) => {
      const tolerance = Math.max(2, Math.min(6, Math.max(candidate.height, item.height) * 0.35));
      return Math.abs(candidate.y - item.y) <= tolerance;
    });

    if (line) {
      const nextCount = line.items.length + 1;
      line.y = (line.y * line.items.length + item.y) / nextCount;
      line.height = Math.max(line.height, item.height);
      line.items.push(item);
      return;
    }

    lines.push({ y: item.y, height: item.height, items: [item] });
  });

  const sortedLines = lines.sort((a, b) => b.y - a.y);
  const renderedLines: string[] = [];

  sortedLines.forEach((line, index) => {
    const text = renderTextLine(line);
    if (!text) return;

    if (index > 0) {
      const previousLine = sortedLines[index - 1];
      const verticalGap = previousLine.y - line.y;
      const paragraphGap = Math.max(previousLine.height, line.height) * 1.7;
      if (verticalGap > paragraphGap && renderedLines[renderedLines.length - 1] !== '') {
        renderedLines.push('');
      }
    }

    renderedLines.push(text);
  });

  return renderedLines.join('\n').trim();
}

/** 确保 ResumeData 所有必需字段都有默认值 */
