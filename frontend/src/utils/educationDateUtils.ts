/**
 * 教育经历 - 学历与起止时间自动推算工具
 *
 * 核心设计：
 * - 根据学历文本识别学制年限
 * - 根据开始时间推算结束时间，根据结束时间反推开始时间
 * - 区分字段来源（auto / manual），避免覆盖用户手动填写的内容
 */

// ---------------------------------------------------------------------------
// 学历 → 学制年限映射
// ---------------------------------------------------------------------------

/** 关键词匹配表：匹配到的关键词 → 学制年限 */
const DEGREE_KEYWORD_MAP: Array<{ keywords: string[]; duration: number }> = [
  {
    keywords: [
      '博士研究生', '博士', '博士研究生', '博士', 'phd', 'Ph.D.', 'Ph.D', 'Doctorate',
      '博士', 'ph.d', 'PHD',
    ],
    duration: 4,
  },
  {
    keywords: [
      '硕士研究生', '硕士', '研究生', '硕士', 'master', "Master's", 'Master',
      '硕士', 'M.S.', 'M.A.', 'M.Eng.', 'MSc', 'MA',
    ],
    duration: 3,
  },
  {
    keywords: ['本科', '大学本科', '本科', 'bachelor', "Bachelor's", 'Bachelor', 'B.S.', 'B.A.', 'B.Eng.', 'BSc', 'BA', 'undergraduate'],
    duration: 4,
  },
  {
    keywords: ['大专', '专科', '高职', '大专', '专科', 'associate', 'Associate', 'diploma', 'Diploma'],
    duration: 3,
  },
];

/** 明确不应触发推算的学历关键词（如"其他"） */
const SKIP_DEGREE_KEYWORDS = ['其他', 'other', 'Other', '高中', '初中', '小学', '中专', '职高', 'high school'];

/**
 * 根据学历文本识别学制年限
 * @returns 学制年数，无法识别则返回 null
 */
export function getDegreeDuration(degree: string): number | null {
  if (!degree || typeof degree !== 'string') return null;
  const trimmed = degree.trim();
  if (!trimmed) return null;

  // 检查是否属于应跳过的学历
  const lowerTrimmed = trimmed.toLowerCase();
  for (const skip of SKIP_DEGREE_KEYWORDS) {
    if (lowerTrimmed === skip.toLowerCase()) return null;
  }

  // 关键词匹配
  for (const entry of DEGREE_KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (trimmed.includes(kw) || trimmed.toLowerCase().includes(kw.toLowerCase())) {
        return entry.duration;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 日期解析 & 格式化
// ---------------------------------------------------------------------------

interface ParsedDate {
  year: number;
  month: number;
}

/** 月份名称 → 数字 */
const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

/**
 * 解析日期字符串为 { year, month }
 * 支持格式：YYYY.MM, YYYY-MM, YYYY/MM, YYYYMM, 以及英文月份名
 */
function parseDateString(dateStr: string): ParsedDate | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!s) return null;

  // YYYY.MM / YYYY-MM / YYYY/MM
  const sepMatch = s.match(/^(\d{4})\s*[.\-/]\s*(\d{1,2})$/);
  if (sepMatch) {
    const year = parseInt(sepMatch[1], 10);
    const month = parseInt(sepMatch[2], 10);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // YYYYMM (6位连续)
  const compactMatch = s.match(/^(\d{4})(\d{2})$/);
  if (compactMatch) {
    const year = parseInt(compactMatch[1], 10);
    const month = parseInt(compactMatch[2], 10);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // 仅年份 YYYY
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) {
    const year = parseInt(yearOnly[1], 10);
    if (year >= 1900 && year <= 2100) {
      return { year, month: 9 }; // 默认 9 月入学
    }
  }

  // 英文月份名格式 "2020 Sep" 或 "Sep 2020"
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    const lower = s.toLowerCase();
    if (lower.includes(name)) {
      const yearMatch = lower.match(/(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (year >= 1900 && year <= 2100) {
          return { year, month: num };
        }
      }
    }
  }

  return null;
}

/**
 * 格式化日期为 YYYY.MM
 */
function formatDateString(year: number, month: number): string {
  return `${year}.${String(month).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// 时间推算
// ---------------------------------------------------------------------------

const DEFAULT_START_MONTH = 9;  // 默认入学月份
const DEFAULT_END_MONTH = 6;    // 默认毕业月份

/**
 * 根据开始时间 + 学制年限 → 推算结束时间
 * @param startDate 开始时间字符串（如 "2018.09"）
 * @param durationYears 学制年限
 * @returns 推算的结束时间，无法推算则返回 null
 */
export function calculateEndDate(startDate: string, durationYears: number): string | null {
  const parsed = parseDateString(startDate);
  if (!parsed) return null;
  const endYear = parsed.year + durationYears;
  return formatDateString(endYear, DEFAULT_END_MONTH);
}

/**
 * 根据结束时间 + 学制年限 → 反推开始时间
 * @param endDate 结束时间字符串（如 "2022.06"）
 * @param durationYears 学制年限
 * @returns 推算的开始时间，无法推算则返回 null
 */
export function calculateStartDate(endDate: string, durationYears: number): string | null {
  const parsed = parseDateString(endDate);
  if (!parsed) return null;
  const startYear = parsed.year - durationYears;
  return formatDateString(startYear, DEFAULT_START_MONTH);
}

// ---------------------------------------------------------------------------
// 字段来源追踪 & 覆盖判断
// ---------------------------------------------------------------------------

export type FieldSource = 'auto' | 'manual';

export interface EducationFieldSources {
  startDate: FieldSource;
  endDate: FieldSource;
}

/**
 * 判断目标时间字段是否允许被自动推算覆盖
 *
 * 规则：
 * - 目标字段为空 → 允许
 * - 目标字段来源是 'auto'（上次也是自动推算的）→ 允许
 * - 目标字段来源是 'manual'（用户手动改过）→ 不允许
 */
export function canAutoFillField(
  currentValue: string,
  source: FieldSource | undefined,
): boolean {
  if (!currentValue || currentValue.trim() === '') return true;
  if (source === 'auto') return true;
  return false;
}

/**
 * 判断是否为"至今"类字符串
 */
export function isPresentDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const lower = dateStr.trim().toLowerCase();
  return lower === '至今' || lower === 'present' || lower === 'now' || lower === 'current' || lower === '至今';
}

/**
 * 判断时间字符串格式是否合法（能被 parseDateString 解析）
 */
export function isValidDateString(dateStr: string): boolean {
  return parseDateString(dateStr) !== null;
}

// ---------------------------------------------------------------------------
// 高阶：组装完整的自动推算逻辑
// ---------------------------------------------------------------------------

export interface AutoFillResult {
  /** 推算出的开始时间 */
  startDate: string | null;
  /** 推算出的结束时间 */
  endDate: string | null;
  /** 学历是否可识别 */
  degreeRecognized: boolean;
  /** 诊断信息（用于提示文案） */
  hintKey: string | null;
}

/**
 * 执行一次自动推算
 *
 * @param degree     学历文本
 * @param startDate  当前开始时间
 * @param endDate    当前结束时间
 * @param sources    各字段的来源追踪
 * @returns 推算结果（不包含副作用）
 */
export function computeAutoFill(
  degree: string,
  startDate: string,
  endDate: string,
  sources: EducationFieldSources,
): AutoFillResult {
  const duration = getDegreeDuration(degree);

  if (duration === null) {
    return { startDate: null, endDate: null, degreeRecognized: false, hintKey: null };
  }

  const hasStart = startDate && startDate.trim() !== '';
  const hasEnd = endDate && endDate.trim() !== '';
  const endIsPresent = isPresentDate(endDate);

  // 情况 1：两个时间都已存在
  if (hasStart && hasEnd && !endIsPresent) {
    const startSource = sources.startDate;
    const endSource = sources.endDate;

    // 如果结束时间是自动推算的，根据新的学历重新计算结束时间
    if (endSource === 'auto') {
      const calcEnd = calculateEndDate(startDate, duration);
      return {
        startDate: null,
        endDate: calcEnd,
        degreeRecognized: true,
        hintKey: calcEnd ? 'education.autoHint.fromStart' : null,
      };
    }

    // 如果开始时间是自动推算的，根据新的学历重新计算开始时间
    if (startSource === 'auto') {
      const calcStart = calculateStartDate(endDate, duration);
      return {
        startDate: calcStart,
        endDate: null,
        degreeRecognized: true,
        hintKey: calcStart ? 'education.autoHint.fromEnd' : null,
      };
    }

    // 两个都是用户手动填写的 → 静默不覆盖
    return { startDate: null, endDate: null, degreeRecognized: true, hintKey: null };
  }

  // 情况 2：有开始时间，结束时间为空 → 推算结束时间
  if (hasStart && !hasEnd) {
    if (isValidDateString(startDate)) {
      const calcEnd = calculateEndDate(startDate, duration);
      return {
        startDate: null,
        endDate: calcEnd,
        degreeRecognized: true,
        hintKey: calcEnd ? 'education.autoHint.fromStart' : null,
      };
    }
  }

  // 情况 3：有结束时间，开始时间为空 → 反推开始时间
  if (!hasStart && hasEnd && !endIsPresent) {
    if (isValidDateString(endDate)) {
      const calcStart = calculateStartDate(endDate, duration);
      return {
        startDate: calcStart,
        endDate: null,
        degreeRecognized: true,
        hintKey: calcStart ? 'education.autoHint.fromEnd' : null,
      };
    }
  }

  // 情况 4：结束时间为"至今"且开始时间为空 → 不反推
  if (!hasStart && endIsPresent) {
    return { startDate: null, endDate: null, degreeRecognized: true, hintKey: null };
  }

  // 其他情况：两个都为空，无法推算
  return { startDate: null, endDate: null, degreeRecognized: true, hintKey: null };
}

/**
 * 基于字段来源判断，对 computeAutoFill 结果做安全过滤
 * 确保不会覆盖用户手动填写的内容
 */
export function applyAutoFillSafely(
  result: AutoFillResult,
  currentStartDate: string,
  currentEndDate: string,
  sources: EducationFieldSources,
): { startDate: string | null; endDate: string | null; hintKey: string | null } {
  let newStart: string | null = null;
  let newEnd: string | null = null;

  if (result.startDate !== null) {
    if (canAutoFillField(currentStartDate, sources.startDate)) {
      newStart = result.startDate;
    }
  }

  if (result.endDate !== null) {
    if (canAutoFillField(currentEndDate, sources.endDate)) {
      newEnd = result.endDate;
    }
  }

  return { startDate: newStart, endDate: newEnd, hintKey: result.hintKey };
}
