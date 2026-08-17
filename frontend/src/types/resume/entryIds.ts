import { validate as isUuid, v4 as uuidv4, version as uuidVersion } from 'uuid';
import type { ResumeData } from './core';

/** 为所有可重复简历条目生成统一的无前缀 UUID v4。 */
export function createResumeEntryId(): string {
  return uuidv4();
}

export function createCustomSectionId(): string {
  return `custom-${createResumeEntryId()}`;
}

export function isResumeEntryId(value: unknown): value is string {
  return typeof value === 'string' && isUuid(value) && uuidVersion(value) === 4;
}

export function isCustomSectionId(value: unknown): value is string {
  return typeof value === 'string'
    && value.startsWith('custom-')
    && isResumeEntryId(value.slice('custom-'.length));
}

/** 将可识别的年月统一为 YYYY-MM；“至今”类值统一为 present。 */
export function normalizeResumeDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (['至今', 'present', 'now', 'current'].includes(trimmed.toLowerCase())) return 'present';

  const match = trimmed.match(/^(\d{4})(?:[.\-/]?(\d{1,2}))$/);
  if (!match) return trimmed;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return trimmed;
  return `${match[1]}-${String(month).padStart(2, '0')}`;
}

/**
 * 规范化可重复内容：条目 UUID、日期、自定义模块 ID 及其编排引用。
 * 旧数据中的空 ID、索引式 ID、非 v4 UUID 和重复 UUID 都会被替换。
 */
export function normalizeResumeEntryIds(data: ResumeData): ResumeData {
  const usedIds = new Set<string>();
  const normalizeEntries = <T extends { id: string }>(entries: T[] | undefined): T[] | undefined => (
    entries?.map((entry) => {
      const safeEntry = entry && typeof entry === 'object' ? entry : {} as T;
      const currentId = safeEntry.id;
      const canonicalCurrentId = isResumeEntryId(currentId) ? currentId.toLowerCase() : null;
      let id = canonicalCurrentId && !usedIds.has(canonicalCurrentId)
        ? canonicalCurrentId
        : createResumeEntryId();
      while (usedIds.has(id)) id = createResumeEntryId();
      usedIds.add(id);
      return id === currentId ? safeEntry : { ...safeEntry, id };
    })
  );

  const customIdMap = new Map<string, string>();
  const usedCustomIds = new Set<string>();
  const customSections = data.customSections.map((section) => {
    const currentId = section.id;
    const canonicalCurrentId = isCustomSectionId(currentId) ? currentId.toLowerCase() : null;
    let id = canonicalCurrentId && !usedCustomIds.has(canonicalCurrentId)
      ? canonicalCurrentId
      : createCustomSectionId();
    while (usedCustomIds.has(id)) id = createCustomSectionId();
    usedCustomIds.add(id);
    if (currentId) customIdMap.set(currentId, id);
    return id === currentId ? section : { ...section, id };
  });
  const mapSectionId = (id: string) => customIdMap.get(id) ?? id;
  const education = (normalizeEntries(data.education) ?? []).map((entry) => {
    // `courses` was the legacy name for this free-form field. Read it once during
    // normalization, then omit it so newly saved/exported JSON only uses `details`.
    const legacyEntry = entry as typeof entry & { courses?: unknown };
    const { courses, ...currentEntry } = legacyEntry;
    return {
      ...currentEntry,
      startDate: normalizeResumeDate(entry.startDate),
      endDate: normalizeResumeDate(entry.endDate),
      details: typeof entry.details === 'string'
        ? entry.details
        : typeof courses === 'string' ? courses : '',
    };
  });
  const workExperience = (normalizeEntries(data.workExperience) ?? []).map((entry) => {
    const legacyEntry = entry as typeof entry & { highlights?: unknown };
    return {
      // Keep this explicit order: it is also the property order used by JSON export.
      id: entry.id,
      company: entry.company ?? '',
      location: entry.location ?? '',
      position: entry.position ?? '',
      startDate: normalizeResumeDate(entry.startDate),
      endDate: normalizeResumeDate(entry.endDate),
      description: typeof entry.description === 'string'
        ? entry.description
        : typeof legacyEntry.highlights === 'string' ? legacyEntry.highlights : '',
    };
  });
  const projects = (normalizeEntries(data.projects) ?? []).map((entry) => ({
    ...entry,
    startDate: normalizeResumeDate(entry.startDate),
    endDate: normalizeResumeDate(entry.endDate),
  }));
  const honors = (normalizeEntries(data.honors) ?? []).map((entry) => ({
    ...entry,
    date: normalizeResumeDate(entry.date),
  }));

  return {
    ...data,
    education,
    workExperience,
    projects,
    honors,
    customSections,
    sectionConfig: {
      order: data.sectionConfig.order.map(mapSectionId),
      hidden: data.sectionConfig.hidden.map(mapSectionId),
      titleOverrides: Object.fromEntries(
        Object.entries(data.sectionConfig.titleOverrides)
          .map(([id, title]) => [mapSectionId(id), title]),
      ),
    },
  };
}
