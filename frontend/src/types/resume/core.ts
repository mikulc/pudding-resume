import i18n from '../../utils/i18n';

export interface PersonalInfo {
  fullName: string;
  phone: string;
  email: string;
  photoUrl: string;
  photoStyle?: PersonalPhotoStyle;
  jobStatus?: string;
  jobTarget?: string;
  location?: string;
  /** 字段标签：'icon' = 图标模式，'text' = 文字模式 */
  displayMode?: 'icon' | 'text';
  /** 头像布局：'left' = 头像在左信息在右，'right' = 头像在右信息在左 */
  photoLayout?: 'left' | 'right';
  /** 隐藏的字段列表 */
  hiddenFields?: string[];
  /** 可拖拽字段的排序（不含姓名） */
  fieldOrder?: string[];
  /** 自定义字段 { key: value }，如 { "微信": "wxid_xxx", "GitHub": "@user" } */
  customFields?: Record<string, string>;
  /** 字段图标映射 { fieldKey: iconKey }，如 { "微信": "chat", "GitHub": "code" } */
  iconMap?: Record<string, string>;
  /** 内置字段显示标签覆盖 { fieldKey: displayLabel }，只影响展示名称，不改变字段 key */
  fieldLabels?: Record<string, string>;
}

export interface PersonalPhotoStyle {
  width: number;
  height: number;
  borderRadius: number;
}

export const DEFAULT_PERSONAL_PHOTO_STYLE: PersonalPhotoStyle = {
  width: 100,
  height: 130,
  borderRadius: 6,
};

/** 个人信息可拖拽字段的默认排序 */
export const DEFAULT_PERSONAL_FIELD_ORDER = ['fullName', 'phone', 'email', 'jobStatus', 'jobTarget', 'location'];

export const BUILTIN_PERSONAL_FIELDS = ['fullName', 'phone', 'email', 'jobStatus', 'jobTarget', 'location'];

export const DEFAULT_PERSONAL_FIELD_LABELS: Record<string, string> = {
  fullName: i18n.t('field.name', { ns: 'resume' }),
  phone: i18n.t('field.phone', { ns: 'resume' }),
  email: i18n.t('field.email', { ns: 'resume' }),
  jobStatus: i18n.t('field.jobStatus', { ns: 'resume' }),
  jobTarget: i18n.t('field.jobTitle', { ns: 'resume' }),
  location: i18n.t('field.location', { ns: 'resume' }),
};

/** Get personal field labels in current language */
export function getPersonalFieldLabels(): Record<string, string> {
  return {
    fullName: i18n.t('field.name', { ns: 'resume' }),
    phone: i18n.t('field.phone', { ns: 'resume' }),
    email: i18n.t('field.email', { ns: 'resume' }),
    jobStatus: i18n.t('field.jobStatus', { ns: 'resume' }),
    jobTarget: i18n.t('field.jobTitle', { ns: 'resume' }),
    location: i18n.t('field.location', { ns: 'resume' }),
  };
}

export interface EducationEntry {
  id: string;
  school: string;
  major: string;
  degree: string;
  startDate: string;
  endDate: string;
  courses?: string;
}

export interface WorkEntry {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  highlights: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  link: string;
  highlights: string;
}

export interface HonorEntry {
  id: string;
  name: string;
  date: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  date: string;
}

export interface PortfolioEntry {
  id: string;
  name: string;
  link: string;
  description: string;
}

/** 自定义模块数据 */
export interface CustomSection {
  id: string;    // 格式: custom-{timestamp}
  name: string;  // 模块名称
  content: string; // Markdown 内容
}

// ==================== Core Resume Data ====================

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary?: string;
  education: EducationEntry[];
  workExperience: WorkEntry[];
  projects: ProjectEntry[];
  skills: string;
  honors?: HonorEntry[];
  certifications?: CertificationEntry[];
  portfolio?: PortfolioEntry[];
  customSections?: CustomSection[];
  sectionOrder?: SectionKey[];
  /** 模块标题自定义覆盖（key → 自定义标题），可用于系统模块和自定义模块 */
  sectionTitles?: Record<string, string>;
  /** 在预览中隐藏的模块 key 列表 */
  hiddenSections?: SectionKey[];
}

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'personal',
  'education',
  'work',
  'projects',
  'skills',
  'honors',
  'certifications',
  'portfolio',
  'summary',
];

/** 系统模块默认标题映射（key → 中文名称） */
export const SYSTEM_MODULE_DEFAULT_TITLES: Record<SectionKey, string> = {
  personal: i18n.t('module.personalInfo', { ns: 'resume' }),
  summary: i18n.t('field.summary', { ns: 'resume' }),
  education: i18n.t('module.education', { ns: 'resume' }),
  skills: i18n.t('module.skills', { ns: 'resume' }),
  work: i18n.t('module.workExperience', { ns: 'resume' }),
  projects: i18n.t('module.projects', { ns: 'resume' }),
  honors: i18n.t('module.honors', { ns: 'resume' }),
  certifications: i18n.t('module.certificates', { ns: 'resume' }),
  portfolio: i18n.t('module.portfolio', { ns: 'resume' }),
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
    certifications: i18n.t('module.certificates', { ns: 'resume' }),
    portfolio: i18n.t('module.portfolio', { ns: 'resume' }),
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
  | { type: 'SET_WORK_HIGHLIGHTS'; payload: { workId: string; highlights: string } }
  | { type: 'ADD_PROJECT'; payload: ProjectEntry }
  | { type: 'UPDATE_PROJECT'; payload: ProjectEntry }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_PROJECT_HIGHLIGHTS'; payload: { projectId: string; highlights: string } }
  | { type: 'ADD_HONOR'; payload: HonorEntry }
  | { type: 'UPDATE_HONOR'; payload: HonorEntry }
  | { type: 'DELETE_HONOR'; payload: string }
  | { type: 'ADD_CERTIFICATION'; payload: CertificationEntry }
  | { type: 'UPDATE_CERTIFICATION'; payload: CertificationEntry }
  | { type: 'DELETE_CERTIFICATION'; payload: string }
  | { type: 'ADD_PORTFOLIO'; payload: PortfolioEntry }
  | { type: 'UPDATE_PORTFOLIO'; payload: PortfolioEntry }
  | { type: 'DELETE_PORTFOLIO'; payload: string }
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
