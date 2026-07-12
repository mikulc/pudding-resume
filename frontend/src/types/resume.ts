import {
  CUSTOM_COLOR_DEFAULTS,
  THEME_DEFAULTS,
  WATERMARK_DEFAULTS,
  DEFAULT_LAYOUT_ID,
  DEFAULT_FONT_FAMILY,
  DEFAULT_TITLE_LAYOUT,
} from '../config/defaults';
import i18n from '../utils/i18n';

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

// ==================== Layout Types ====================

/**
 * 布局标识符 —— 字符串类型，无编译时约束。
 * 运行时通过 registry/layouts 注册表校验，未知 layoutId 降级到 'skyveil'。
 * 这使得新增布局无需修改类型定义，后端可独立发布新样式元数据。
 */
export type LayoutId = string;

export interface StyleLibraryEntry {
  id: string;
  name: string;
  description: string;
  highlights: string[];
  layoutId: string;
  category: string;
  previewColors: {
    headerBg: string;
    accentBar: string;
    bodyBg: string;
  };
  previewImage?: string;
  previewVersion?: string;
}

export type SaveStatusType = 'saved' | 'unsaved' | 'saving' | 'error';

// ==================== Multi-Resume Types ====================

export interface ResumeListItem {
  id: string;
  name: string;
  content: ResumeData;
  settings?: ThemeSettings;
  updated_at: string;
  /** 简历来源：'cloud' = 云端，'local' = 本地文件 */
  source?: 'cloud' | 'local';
  /** 本地简历文件名（仅 source='local' 时有效） */
  local_file_name?: string;
  /** 关联的云端简历 UUID（本地简历匹配云端用） */
  cloud_uuid?: string;
}

export interface ResumeCopyResponse {
  id: string;
  name: string;
  content: ResumeData;
  settings?: ThemeSettings;
  updated_at: string;
}

export interface WatermarkSettings {
  enabled: boolean;
  content: string;
  isCustomContent?: boolean;  // 用户是否手动修改过水印内容
  opacity: number;      // 0.03 ~ 0.3
  fontSize: number;     // 1 ~ 48 px
  rotation: number;     // -90 ~ 0 度
  color: string;        // hex color
  density: 'low' | 'medium' | 'high';  // 稀疏 | 适中 | 密集
}

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: WATERMARK_DEFAULTS.enabled,
  content: i18n.t('watermark.defaultContent', { ns: 'resume' }),
  isCustomContent: false,
  opacity: WATERMARK_DEFAULTS.opacity,
  fontSize: WATERMARK_DEFAULTS.fontSize,
  rotation: WATERMARK_DEFAULTS.rotation,
  color: WATERMARK_DEFAULTS.color,
  density: WATERMARK_DEFAULTS.density,
};

// 自定义主题颜色
export interface CustomThemeColors {
  bg: string;       // 标题背景色，如 '#DBEAFE'
  border: string;   // 标题强调色，如 '#3B82F6'
  tagBg: string;    // 标签背景色，如 '#EFF6FF'
  tagText: string;  // 标签文字色，如 '#2563EB'
}

export const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  bg: CUSTOM_COLOR_DEFAULTS.bg,
  border: CUSTOM_COLOR_DEFAULTS.border,
  tagBg: CUSTOM_COLOR_DEFAULTS.tag_bg,
  tagText: CUSTOM_COLOR_DEFAULTS.tag_text,
};

/** 混白色（factor 越大越接近白色，0~1） */
function mixWithWhite(hex: string, factor: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - factor) + 255 * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - factor) + 255 * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - factor) + 255 * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** 根据主色自动衍生 bg / tagBg / tagText */
export function deriveCustomColors(primary: string): CustomThemeColors {
  return {
    border: primary,
    bg: mixWithWhite(primary, 0.85),
    tagBg: mixWithWhite(primary, 0.92),
    tagText: primary,
  };
}

export type ColorThemeKey = 'blue' | 'gray' | 'black' | 'custom';

export interface ThemeSettings {
  layoutId: string;
  colorTheme: ColorThemeKey;
  customColors?: CustomThemeColors;
  fontFamily: string; // 字体选项 ID，对应 fonts.ts 中的 FontOption.id
  pageMargin: number; // mm
  lineSpacing: number;
  fontSize: number; // px - 正文字号
  sectionTitleFontSize: number; // px - 模块标题字号
  entryTitleFontSize: number; // px - 条目标题行字号
  watermark: WatermarkSettings;
  titleLayout: 'three-column' | 'stacked' | 'compact';
}

export const DEFAULT_THEME: ThemeSettings = {
  layoutId: DEFAULT_LAYOUT_ID,
  colorTheme: 'custom',
  customColors: DEFAULT_CUSTOM_COLORS,
  fontFamily: DEFAULT_FONT_FAMILY,
  pageMargin: THEME_DEFAULTS.page_margin,
  lineSpacing: THEME_DEFAULTS.line_spacing,
  fontSize: THEME_DEFAULTS.font_size,
  sectionTitleFontSize: THEME_DEFAULTS.section_title_font_size,
  entryTitleFontSize: THEME_DEFAULTS.entry_title_font_size,
  watermark: DEFAULT_WATERMARK,
  titleLayout: DEFAULT_TITLE_LAYOUT,
};

export interface ResumeMeta {
  id: string | null;
  name: string;
}

export type RightPanelTab = 'settings' | 'ats';
export type MobileDockMode = 'edit' | 'settings' | 'preview';

// ==================== AI Diagnosis Types ====================

/** AI 诊断问题类型 */
export type DiagnosisIssueType = 'overclaim' | 'vague' | 'no_metric' | 'empty_word' | 'weak';

/** AI 诊断严重程度 */
export type DiagnosisSeverity = 'high' | 'medium' | 'low';

/** 单条诊断结果 */
export interface DiagnosisItem {
  id: string;
  original_text: string;
  suggestion: string;
  replacement?: string;
  severity: DiagnosisSeverity;
  issue_type: DiagnosisIssueType;
  section_module: string;
}

/** 诊断响应 */
export interface DiagnosisResult {
  items: DiagnosisItem[];
}

export type AtsSeverity = 'high' | 'medium' | 'low';

export interface AtsIssue {
  severity: AtsSeverity;
  title: string;
  description: string;
  target_section?: SectionKey;
  rewrite_hint?: string;
}

export interface AtsAnalysisResult {
  score: number;
  summary: string;
  matched_keywords: string[];
  missing_keywords: string[];
  format_issues: AtsIssue[];
  content_suggestions: AtsIssue[];
  recommended_layouts?: string[];
}

/** 诊断状态 */
export interface DiagnosisState {
  /** 诊断结果列表 */
  items: DiagnosisItem[];
  /** 是否正在诊断中 */
  loading: boolean;
  /** 上次诊断时间戳 */
  lastDiagnosedAt: number | null;
  /** 错误信息 */
  error: string | null;
  /** 当前高亮的诊断项 ID（用于预览区定位） */
  activeItemId: string | null;
  /** 流式诊断时 AI 返回的实时文本 */
  streamingText?: string;
}

export interface AppUIState {
  activeSection: SectionKey | null;
  zoom: number;
  settingsOpen: boolean;
  editorOpen: boolean;
  theme: ThemeSettings;
  saveStatus: SaveStatusType;
  saveTrigger: number; // incremented on save complete, drives breathing animation
  lastSavedAt: number | null; // 上次保存成功的时间戳（ms）
  drawerOpen: boolean; // 抽屉是否打开（用于快捷键隔离）
  isSecondaryEditorOpen: boolean; // 二级长文本编辑面板是否打开（用于拦截预览区点击）
  resumeMeta: ResumeMeta; // 当前编辑的简历元信息
  rightPanelTab: RightPanelTab; // 右侧面板当前激活的 Tab
  mobileDockMode: MobileDockMode; // 移动端底部 Dock 当前模式
}

export type AppUIAction =
  | { type: 'SET_ACTIVE_SECTION'; payload: SectionKey | null }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_SETTINGS_OPEN'; payload: boolean }
  | { type: 'TOGGLE_EDITOR' }
  | { type: 'SET_EDITOR_OPEN'; payload: boolean }
  | { type: 'SET_THEME'; payload: Partial<ThemeSettings> }
  | { type: 'SET_WATERMARK'; payload: Partial<WatermarkSettings> }
  | { type: 'RESET_STYLE' }
  | { type: 'SET_SAVE_STATUS'; payload: SaveStatusType }
  | { type: 'TRIGGER_SAVE_ANIMATION' }
  | { type: 'SET_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_RESUME_META'; payload: Partial<ResumeMeta> }
  | { type: 'SET_RIGHT_PANEL_TAB'; payload: RightPanelTab }
  | { type: 'SET_MOBILE_DOCK_MODE'; payload: MobileDockMode };
