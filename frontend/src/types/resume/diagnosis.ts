import type { SectionKey } from './core';

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
