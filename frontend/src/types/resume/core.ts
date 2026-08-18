import i18n from '../../utils/i18n';

export const BUILTIN_PERSONAL_FIELDS = [
  'fullName',
  'phone',
  'email',
  'jobSearchStatus',
  'targetRole',
  'preferredLocation',
] as const;

export type BuiltinPersonalFieldId = typeof BUILTIN_PERSONAL_FIELDS[number];

export function isBuiltinPersonalFieldId(field: string): field is BuiltinPersonalFieldId {
  return BUILTIN_PERSONAL_FIELDS.includes(field as BuiltinPersonalFieldId);
}

export interface CustomPersonalField {
  id: string;
  label: string;
  value: string;
}

export interface PersonalFieldConfig {
  order: string[];
  hidden: string[];
  labelOverrides: Partial<Record<BuiltinPersonalFieldId, string>>;
  iconOverrides: Record<string, string>;
}

export interface PersonalInfo {
  fullName: string;
  phone: string;
  email: string;
  photoUrl: string;
  jobSearchStatus: string;
  targetRole: string;
  preferredLocation: string;
  customFields: CustomPersonalField[];
  fieldConfig: PersonalFieldConfig;
}

export interface PersonalPhotoStyle {
  width: number;
  height: number;
  borderRadius: number;
}

export const DEFAULT_PERSONAL_PHOTO_STYLE: PersonalPhotoStyle = {
  width: 100,
  height: 133,
  borderRadius: 6,
};

/** 个人信息字段默认排序；姓名固定在第一位。 */
export const DEFAULT_PERSONAL_FIELD_ORDER: BuiltinPersonalFieldId[] = [...BUILTIN_PERSONAL_FIELDS];

export const DEFAULT_PERSONAL_FIELD_LABELS: Record<string, string> = {
  fullName: i18n.t('field.name', { ns: 'resume' }),
  phone: i18n.t('field.phone', { ns: 'resume' }),
  email: i18n.t('field.email', { ns: 'resume' }),
  jobSearchStatus: i18n.t('field.jobStatus', { ns: 'resume' }),
  targetRole: i18n.t('field.jobTitle', { ns: 'resume' }),
  preferredLocation: i18n.t('field.location', { ns: 'resume' }),
};

/** Get personal field labels in current language */
export function getPersonalFieldLabels(): Record<string, string> {
  return {
    fullName: i18n.t('field.name', { ns: 'resume' }),
    phone: i18n.t('field.phone', { ns: 'resume' }),
    email: i18n.t('field.email', { ns: 'resume' }),
    jobSearchStatus: i18n.t('field.jobStatus', { ns: 'resume' }),
    targetRole: i18n.t('field.jobTitle', { ns: 'resume' }),
    preferredLocation: i18n.t('field.location', { ns: 'resume' }),
  };
}

const LEGACY_PERSONAL_FIELD_IDS: Record<string, BuiltinPersonalFieldId> = {
  jobStatus: 'jobSearchStatus',
  jobTarget: 'targetRole',
  location: 'preferredLocation',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))];
}

function mapLegacyFieldId(id: string, customIdByLegacyLabel: Map<string, string>): string {
  return LEGACY_PERSONAL_FIELD_IDS[id] ?? customIdByLegacyLabel.get(id) ?? id;
}

/** 为新建的自定义字段生成与显示名称无关的稳定 ID。 */
export function createCustomPersonalFieldId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * PersonalInfo 的 canonical Adapter：兼容旧字段命名和旧的平行 Record/数组结构，
 * 返回编辑器、预览和导出可以直接信任的完整模型。
 */
export function normalizePersonalInfo(value?: unknown): PersonalInfo {
  const raw = asRecord(value);
  const rawCustomFields = raw.customFields ?? raw.custom_fields;
  const customIdByLegacyLabel = new Map<string, string>();
  const usedCustomIds = new Set<string>();
  const customFields: CustomPersonalField[] = [];

  if (Array.isArray(rawCustomFields)) {
    rawCustomFields.forEach((item, index) => {
      const field = asRecord(item);
      const preferredId = asString(field.id);
      let id = preferredId;
      if (
        !preferredId
        || id === 'photo'
        || isBuiltinPersonalFieldId(id)
        || usedCustomIds.has(id)
      ) {
        id = `custom-imported-${index + 1}`;
        let suffix = 2;
        while (usedCustomIds.has(id)) {
          id = `custom-imported-${index + 1}-${suffix}`;
          suffix += 1;
        }
      }
      usedCustomIds.add(id);
      customFields.push({ id, label: asString(field.label) || id, value: asString(field.value) });
    });
  } else {
    Object.entries(asRecord(rawCustomFields)).forEach(([label, fieldValue], index) => {
      const id = `custom-legacy-${index + 1}`;
      customIdByLegacyLabel.set(label, id);
      usedCustomIds.add(id);
      customFields.push({ id, label, value: asString(fieldValue) });
    });
  }

  const rawConfig = asRecord(raw.fieldConfig ?? raw.field_config);
  const rawOrder = rawConfig.order ?? raw.fieldOrder ?? raw.field_order;
  const configuredOrder = uniqueStrings(rawOrder)
    .map((id) => mapLegacyFieldId(id, customIdByLegacyLabel));
  const validIds = new Set<string>([...BUILTIN_PERSONAL_FIELDS, ...customFields.map((field) => field.id)]);
  const order = configuredOrder.filter((id) => validIds.has(id));
  for (const id of [...BUILTIN_PERSONAL_FIELDS, ...customFields.map((field) => field.id)]) {
    if (!order.includes(id)) order.push(id);
  }
  const normalizedOrder = ['fullName', ...order.filter((id) => id !== 'fullName')];

  const rawHidden = rawConfig.hidden ?? raw.hiddenFields ?? raw.hidden_fields;
  const hidden = uniqueStrings(rawHidden)
    .map((id) => mapLegacyFieldId(id, customIdByLegacyLabel))
    .filter((id) => id === 'photo' || validIds.has(id));

  const rawLabelOverrides = asRecord(
    rawConfig.labelOverrides ?? rawConfig.label_overrides ?? raw.fieldLabels ?? raw.field_labels,
  );
  const labelOverrides: Partial<Record<BuiltinPersonalFieldId, string>> = {};
  for (const [legacyId, label] of Object.entries(rawLabelOverrides)) {
    const id = mapLegacyFieldId(legacyId, customIdByLegacyLabel);
    if (isBuiltinPersonalFieldId(id) && typeof label === 'string' && label.trim()) {
      labelOverrides[id] = label;
    }
  }

  const rawIconOverrides = asRecord(
    rawConfig.iconOverrides ?? rawConfig.icon_overrides ?? raw.iconMap ?? raw.icon_map,
  );
  const iconOverrides: Record<string, string> = {};
  for (const [legacyId, icon] of Object.entries(rawIconOverrides)) {
    const id = mapLegacyFieldId(legacyId, customIdByLegacyLabel);
    if (validIds.has(id) && typeof icon === 'string' && icon) iconOverrides[id] = icon;
  }

  return {
    fullName: asString(raw.fullName ?? raw.full_name),
    phone: asString(raw.phone),
    email: asString(raw.email),
    photoUrl: asString(raw.photoUrl ?? raw.photo_url),
    jobSearchStatus: asString(raw.jobSearchStatus ?? raw.job_search_status ?? raw.jobStatus ?? raw.job_status),
    targetRole: asString(raw.targetRole ?? raw.target_role ?? raw.jobTarget ?? raw.job_target),
    preferredLocation: asString(raw.preferredLocation ?? raw.preferred_location ?? raw.location),
    customFields,
    fieldConfig: { order: normalizedOrder, hidden, labelOverrides, iconOverrides },
  };
}

export interface EducationEntry {
  id: string;
  school: string;
  major: string;
  degree: string;
  startDate: string;
  endDate: string;
  details: string;
}

export interface WorkEntry {
  id: string;
  company: string;
  location: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  link: string;
  description: string;
}

export interface HonorEntry {
  id: string;
  name: string;
  date: string;
}

/** 自定义模块数据 */
export interface CustomSection {
  id: string;    // 格式: custom-{UUID}
  name: string;  // 模块名称
  content: string; // Markdown 内容
}

export interface SectionConfig {
  order: SectionKey[];
  titleOverrides: Record<string, string>;
  hidden: SectionKey[];
}

// ==================== Core Resume Data ====================

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  education: EducationEntry[];
  workExperience: WorkEntry[];
  projects: ProjectEntry[];
  skills: string;
  honors: HonorEntry[];
  customSections: CustomSection[];
  /** 模块排序、标题覆盖与隐藏状态。 */
  sectionConfig: SectionConfig;
}

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'personal',
  'education',
  'work',
  'projects',
  'skills',
  'honors',
  'summary',
];

const REMOVED_BUILTIN_SECTIONS = new Set(['certifications', 'portfolio']);

/** 过滤已下线模块，并保留用户已有的模块顺序。 */
export function normalizeSectionOrder(value: unknown): SectionKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_SECTION_ORDER];
  return [...new Set(value.filter(
    (key): key is string => typeof key === 'string' && !REMOVED_BUILTIN_SECTIONS.has(key),
  ))];
}

/** 过滤已下线模块的隐藏状态。 */
export function normalizeHiddenSections(value: unknown): SectionKey[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (key): key is string => typeof key === 'string' && !REMOVED_BUILTIN_SECTIONS.has(key),
  ))];
}

/** 过滤已下线模块的标题覆盖。 */
export function normalizeSectionTitles(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, title]) => !REMOVED_BUILTIN_SECTIONS.has(key) && typeof title === 'string'),
  ) as Record<string, string>;
}

/** 兼容旧版三个顶层编排字段，返回规范化的模块配置。 */
export function normalizeSectionConfig(
  value: unknown,
  legacyData?: Record<string, unknown>,
): SectionConfig {
  const raw = asRecord(value);
  const legacy = legacyData ?? {};
  return {
    order: normalizeSectionOrder(raw.order ?? legacy.sectionOrder ?? legacy.section_order),
    titleOverrides: normalizeSectionTitles(
      raw.titleOverrides
      ?? raw.title_overrides
      ?? legacy.sectionTitles
      ?? legacy.section_titles,
    ),
    hidden: normalizeHiddenSections(raw.hidden ?? legacy.hiddenSections ?? legacy.hidden_sections),
  };
}

/** 系统模块默认标题映射（key → 中文名称） */
export const SYSTEM_MODULE_DEFAULT_TITLES: Record<SectionKey, string> = {
  personal: i18n.t('module.personalInfo', { ns: 'resume' }),
  summary: i18n.t('field.summary', { ns: 'resume' }),
  education: i18n.t('module.education', { ns: 'resume' }),
  skills: i18n.t('module.skills', { ns: 'resume' }),
  work: i18n.t('module.workExperience', { ns: 'resume' }),
  projects: i18n.t('module.projects', { ns: 'resume' }),
  honors: i18n.t('module.honors', { ns: 'resume' }),
};

/** Get system module default titles in current language */
export function getSystemModuleDefaultTitles(): Record<SectionKey, string> {
  return {
    personal: i18n.t('module.personalInfo', { ns: 'resume' }),
    summary: i18n.t('field.summary', { ns: 'resume' }),
    education: i18n.t('module.education', { ns: 'resume' }),
    skills: i18n.t('module.skills', { ns: 'resume' }),
    work: i18n.t('module.workExperience', { ns: 'resume' }),
    projects: i18n.t('module.projects', { ns: 'resume' }),
    honors: i18n.t('module.honors', { ns: 'resume' }),
  };
}

export type ResumeAction =
  | { type: 'SET_PERSONAL_INFO'; payload: Partial<PersonalInfo> }
  | { type: 'ADD_EDUCATION'; payload: EducationEntry }
  | { type: 'UPDATE_EDUCATION'; payload: EducationEntry }
  | { type: 'DELETE_EDUCATION'; payload: string }
  | { type: 'SET_SKILLS'; payload: string }
  | { type: 'ADD_WORK_EXPERIENCE'; payload: WorkEntry }
  | { type: 'UPDATE_WORK_EXPERIENCE'; payload: WorkEntry }
  | { type: 'DELETE_WORK_EXPERIENCE'; payload: string }
  | { type: 'SET_WORK_DESCRIPTION'; payload: { workId: string; description: string } }
  | { type: 'ADD_PROJECT'; payload: ProjectEntry }
  | { type: 'UPDATE_PROJECT'; payload: ProjectEntry }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_PROJECT_DESCRIPTION'; payload: { projectId: string; description: string } }
  | { type: 'ADD_HONOR'; payload: HonorEntry }
  | { type: 'UPDATE_HONOR'; payload: HonorEntry }
  | { type: 'DELETE_HONOR'; payload: string }
  | { type: 'SET_SUMMARY'; payload: string }
  | { type: 'LOAD_DATA'; payload: ResumeData }
  | { type: 'RESTORE_STATE'; payload: ResumeData }
  | { type: 'REORDER_SECTIONS'; payload: SectionKey[] }
  | { type: 'ADD_CUSTOM_SECTION'; payload: { id: string; name: string } }
  | { type: 'UPDATE_CUSTOM_SECTION'; payload: { id: string; updates: Partial<Pick<CustomSection, 'name' | 'content'>> } }
  | { type: 'DELETE_CUSTOM_SECTION'; payload: string }
  | { type: 'UPDATE_SECTION_TITLE'; payload: { key: string; title: string } }
  | { type: 'RESET_SECTION_TITLE'; payload: string }
  | { type: 'TOGGLE_SECTION_VISIBILITY'; payload: SectionKey };

export type SectionKey = string;
