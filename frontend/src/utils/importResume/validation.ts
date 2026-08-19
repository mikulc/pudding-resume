import {
  normalizePersonalInfo,
  normalizeResumeEntryIds,
  normalizeSectionConfig,
  type ResumeData,
} from '../../types/resume';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asMultilineText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item, index) => `${index + 1}. ${item}`)
    .join('\n');
}

function recordEntries(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  );
}

export function ensureDefaults(data: unknown): ResumeData {
  const d = asRecord(data);
  return normalizeResumeEntryIds({
    personalInfo: normalizePersonalInfo(d.personalInfo),
    summary: asMultilineText(d.summary),
    education: recordEntries(d.education).map((entry) => ({
      id: asString(entry.id),
      school: asString(entry.school),
      major: asString(entry.major),
      degree: asString(entry.degree),
      startDate: asString(entry.startDate),
      endDate: asString(entry.endDate),
      details: asMultilineText(entry.details ?? entry.courses),
    })),
    workExperience: recordEntries(d.workExperience).map((entry) => ({
      id: asString(entry.id),
      company: asString(entry.company),
      location: asString(entry.location),
      position: asString(entry.position),
      startDate: asString(entry.startDate),
      endDate: asString(entry.endDate),
      description: asMultilineText(entry.description ?? entry.highlights),
    })),
    projects: recordEntries(d.projects).map((entry) => ({
      id: asString(entry.id),
      name: asString(entry.name),
      role: asString(entry.role),
      startDate: asString(entry.startDate),
      endDate: asString(entry.endDate),
      link: asString(entry.link),
      description: asMultilineText(entry.description ?? entry.highlights),
    })),
    skills: asMultilineText(d.skills),
    honors: recordEntries(d.honors).map((entry) => ({
      id: asString(entry.id),
      name: asString(entry.name),
      date: asString(entry.date),
    })),
    customSections: recordEntries(d.customSections).map((section) => ({
      id: asString(section.id),
      name: asString(section.name),
      content: asMultilineText(section.content),
    })),
    sectionConfig: normalizeSectionConfig(d.sectionConfig, d),
  });
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
