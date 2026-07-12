/**
 * 简历导入工具模块
 * 支持 JSON / PDF / Word(.docx) / Markdown(.md) 四种格式的简历文件导入
 */

import type { ResumeData, ThemeSettings } from '../types/resume';
import i18n from './i18n';

/** 导入结果类型 */
export interface ImportResult {
  resumeData: ResumeData;
  resumeName: string;
  /** 导入 JSON 时的源简历 UUID（仅 JSON 导入时有值） */
  sourceUuid?: string | null;
  /** 导入 JSON 时携带的页面/字体设置（仅 JSON 导入且文件包含 settings 字段时有值） */
  settings?: ThemeSettings | null;
}

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
function ensureDefaults(data: unknown): ResumeData {
  const d = data as Record<string, unknown>;
  return {
    personalInfo: (d.personalInfo as ResumeData['personalInfo']) || {
      fullName: '',
      phone: '',
      email: '',
      photoUrl: '',
    },
    summary: (typeof d.summary === 'string' ? d.summary : undefined) as string | undefined,
    education: Array.isArray(d.education) ? d.education as ResumeData['education'] : [],
    workExperience: Array.isArray(d.workExperience) ? d.workExperience as ResumeData['workExperience'] : [],
    projects: Array.isArray(d.projects) ? d.projects as ResumeData['projects'] : [],
    skills: typeof d.skills === 'string' ? d.skills : '',
    honors: Array.isArray(d.honors) ? d.honors as ResumeData['honors'] : undefined,
    certifications: Array.isArray(d.certifications) ? d.certifications as ResumeData['certifications'] : undefined,
    portfolio: Array.isArray(d.portfolio) ? d.portfolio as ResumeData['portfolio'] : undefined,
    customSections: Array.isArray(d.customSections) ? d.customSections as ResumeData['customSections'] : undefined,
    sectionOrder: Array.isArray(d.sectionOrder) ? d.sectionOrder as ResumeData['sectionOrder'] : undefined,
    sectionTitles: (d.sectionTitles as ResumeData['sectionTitles']) || undefined,
    hiddenSections: Array.isArray(d.hiddenSections) ? d.hiddenSections as ResumeData['hiddenSections'] : undefined,
  };
}

/**
 * JSON 结构校验
 * 检查导入数据是否具备 ResumeData 的基本结构
 */
export function validateResumeData(data: unknown): data is ResumeData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  // 必须有 personalInfo 字段且包含 fullName
  if (!d.personalInfo || typeof d.personalInfo !== 'object') return false;
  const pi = d.personalInfo as Record<string, unknown>;
  if (typeof pi.fullName !== 'string') return false;

  // 核心数组字段必须是数组（如果存在）
  if (d.education !== undefined && !Array.isArray(d.education)) return false;
  if (d.workExperience !== undefined && !Array.isArray(d.workExperience)) return false;
  if (d.projects !== undefined && !Array.isArray(d.projects)) return false;

  return true;
}

/**
 * JSON 导入：读取文件 → 解析 JSON → 校验结构 → 返回 ResumeData
 */
export async function importFromJSON(file: File): Promise<ImportResult> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(i18n.t('import.error.jsonInvalid', { ns: 'resume' }));
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(i18n.t('import.error.jsonEmpty', { ns: 'resume' }));
  }

  const obj = parsed as Record<string, unknown>;

  // 兼容两种结构：
  // 1. 顶层直接包含 personalInfo（标准 ResumeData）
  // 2. 顶层包含 content 字段（本地存储/导出的完整简历文件）
  let data: unknown;
  let resumeName = file.name.replace(/\.json$/i, '');
  let sourceUuid: string | null = null;

  if (obj.content && typeof obj.content === 'object') {
    // 完整简历文件格式（包含 content + settings + name + uuid）
    data = obj.content;
    if (typeof obj.name === 'string') {
      resumeName = obj.name;
    }
    // 提取 UUID（导出时附加的简历唯一标识）
    if (typeof obj.uuid === 'string') {
      sourceUuid = obj.uuid;
    }
  } else {
    // 直接是 ResumeData 结构
    data = parsed;
  }

  if (!validateResumeData(data)) {
    throw new Error(i18n.t('import.error.jsonMissingRequiredFields', { ns: 'resume' }));
  }

  // 提取页面/字体设置（若存在）
  let settings: ThemeSettings | null = null;
  if (obj.settings && typeof obj.settings === 'object') {
    settings = obj.settings as ThemeSettings;
  }

  return {
    resumeData: ensureDefaults(data),
    resumeName,
    sourceUuid,
    settings,
  };
}

/**
 * PDF 导入：使用 pdfjs-dist 提取文本 → 调用 AI fill 智能解析 → 返回 ResumeData
 */
export async function importFromPDF(file: File): Promise<ImportResult> {
  // 动态导入 pdfjs-dist，避免增大初始 bundle
  const pdfjsLib = await import('pdfjs-dist');

  // 设置 worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Extract page text while preserving the PDF's visual line breaks.
  const textParts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = extractPdfPageText(textContent);
    if (pageText.trim()) {
      textParts.push(pageText);
    }
  }

  const extractedText = textParts.join('\n\n').trim();
  if (!extractedText) {
    throw new Error(i18n.t('import.error.pdfNoText', { ns: 'resume' }));
  }

  const resumeName = file.name.replace(/\.pdf$/i, '');

  // 调用 AI fill 智能解析
  const resumeData = await parseTextWithAI(extractedText);

  return { resumeData, resumeName };
}

/**
 * Word 导入：使用 mammoth 提取文本 → 调用 AI fill 智能解析 → 返回 ResumeData
 */
export async function importFromWord(file: File): Promise<ImportResult> {
  // 动态导入 mammoth，避免增大初始 bundle
  const mammoth = await import('mammoth');

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  const extractedText = result.value.trim();
  if (!extractedText) {
    throw new Error(i18n.t('import.error.wordNoText', { ns: 'resume' }));
  }

  const resumeName = file.name.replace(/\.docx?$/i, '');

  // 调用 AI fill 智能解析
  const resumeData = await parseTextWithAI(extractedText);

  return { resumeData, resumeName };
}

/**
 * Markdown 导入：读取 .md 文件文本 → 调用 AI fill 智能解析 → 返回 ResumeData
 */
export async function importFromMarkdown(file: File): Promise<ImportResult> {
  const text = await file.text();

  if (!text.trim()) {
    throw new Error(i18n.t('import.error.markdownEmpty', { ns: 'resume' }));
  }

  const resumeName = file.name.replace(/\.md$/i, '');

  // 调用 AI 智能解析
  const resumeData = await parseTextWithAI(text);

  return { resumeData, resumeName };
}

/**
 * 使用 AI fill 接口将纯文本解析为结构化的 ResumeData
 */
async function parseTextWithAI(text: string): Promise<ResumeData> {
  // 动态导入 AI 接口，避免循环依赖
  const { aiService } = await import('../api/ai');

  const formattingHint = [
    'Formatting preservation rules:',
    '1. Preserve meaningful source line breaks in multi-line fields such as skills, project highlights, work highlights, summary, and custom descriptions.',
    '2. When the source contains numbered or bulleted lines, keep each item on its own line in the target string field.',
    '3. Do not merge separate source lines into one long paragraph unless they are clearly the same sentence wrapped by page width.',
  ].join('\n');
  const prompt = `${i18n.t('import.aiParsePrompt', { ns: 'resume', text })}\n\n${formattingHint}`;

  try {
    const result = await aiService(prompt);
    return ensureDefaults(result.resume_data);
  } catch (error) {
    const message = error instanceof Error ? error.message : i18n.t('import.error.aiParseFailed', { ns: 'resume' });
    throw new Error(i18n.t('import.error.smartParseFailed', { ns: 'resume', message }));
  }
}
