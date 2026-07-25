import type { ResumeData, ThemeSettings } from '../../types/resume';

export interface ImportResult {
  resumeData: ResumeData;
  resumeName: string;
  /** 导入 JSON 时的源简历 UUID（仅 JSON 导入时有值） */
  sourceUuid?: string | null;
  /** 导入 JSON 时携带的页面/字体设置（仅 JSON 导入且文件包含 settings 字段时有值） */
  settings?: ThemeSettings | null;
}

