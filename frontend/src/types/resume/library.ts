import type { ResumeData } from './core';
import type { ThemeSettings } from './theme';

export type LayoutId = string;

export interface ThemeLibraryEntry {
  id: string;
  name: string;
  highlights: string[];
  layoutId: string;
  categories: string[];
  previewColors: {
    headerBg: string;
    accentBar: string;
    bodyBg: string;
    sectionBg?: string;
  };
  previewImage?: string;
  previewVersion?: string;
}

export interface TemplateLibraryEntry {
  id: string;
  name: string;
  industry: string;
  categories: string[];
  highlights: string[];
  content: ResumeData;
  defaultThemeId: string;
  defaultTheme: ThemeLibraryEntry;
}

export interface TemplateCategoryEntry {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
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
