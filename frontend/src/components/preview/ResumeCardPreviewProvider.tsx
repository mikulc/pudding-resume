/**
 * ResumeCardPreviewProvider — 轻量 Context Provider
 *
 * 为卡片预览提供与编辑器相同的 ResumeContext + AppUIContext，
 * 但不包含任何异步加载、历史栈、und/redo 等编辑器专有逻辑。
 *
 * 仅提供 section 组件渲染所需的最小上下文：
 * - ResumeContext:  { data, dispatch(noop), dataReady: true }
 * - AppUIContext:  { ui(含 theme), uiDispatch(noop) }
 */

import React, { createContext, useContext } from 'react';
import {
  ResumeContext,
  AppUIContext,
} from '../../context/ResumeContext';
import { DiagnosisContext } from '../../context/DiagnosisContext';
import type { ResumeData, ThemeSettings, DiagnosisItem } from '../../types/resume';
import { DEFAULT_SECTION_ORDER, DEFAULT_THEME } from '../../types/resume';
import type { AppUIState, ResumeAction, AppUIAction } from '../../types/resume';

/**
 * 卡片预览 CSS 作用域上下文。
 * 每个卡片预览实例获得唯一 scope class，用于防止其 <style> 标签污染全局样式。
 */
export const CardPreviewScopeContext = createContext<string | null>(null);

/** 获取当前卡片预览的 scope class（仅在 ResumeCardPreviewProvider 内有效） */
export function useCardPreviewScope(): string | null {
  return useContext(CardPreviewScopeContext);
}

const noopDispatch = (() => {}) as React.Dispatch<ResumeAction>;
const noopUIDispatch = (() => {}) as React.Dispatch<AppUIAction>;
const noopFn = () => {};
const noopAsync = async () => false;
const emptyArray: DiagnosisItem[] = [];

/**
 * 卡片预览中诊断功能不可用，提供空诊断上下文防止组件报错。
 */
const noopDiagnosis = {
  items: emptyArray,
  loading: false,
  error: null as string | null,
  activeItemId: null as string | null,
  hasResults: false,
  runDiagnosis: noopAsync,
  clearDiagnosis: noopFn,
  setActiveItem: noopFn,
  getItemsByModule: () => emptyArray,
  ignoreItem: noopFn,
  optimizeItem: noopFn,
  undoLastAction: () => false,
  canUndoLastAction: false,
};

function normalizeResumeData(content: ResumeData): ResumeData {
  const source = content ?? ({} as ResumeData);
  const personalInfo = source.personalInfo ?? {};
  const stringify = (value: unknown): string => (typeof value === 'string' ? value : '');
  const normalizeHighlights = (entry: any, prefix: string, index: number) => ({
    ...entry,
    id: stringify(entry.id) || `${prefix}-${index + 1}`,
    highlights: Array.isArray(entry.highlights)
      ? entry.highlights.map((item: string, index: number) => `${index + 1}. ${item}`).join('\n')
      : (entry.highlights ?? ''),
  });
  const normalizeWorkEntry = (entry: any, index: number) => {
    const normalized = normalizeHighlights(entry, 'work', index);
    return {
      ...normalized,
      company: stringify(normalized.company),
      position: stringify(normalized.position) || stringify(normalized.title),
      location: stringify(normalized.location),
      startDate: stringify(normalized.startDate),
      endDate: stringify(normalized.endDate),
    };
  };
  const normalizeProjectEntry = (entry: any, index: number) => {
    const normalized = normalizeHighlights(entry, 'project', index);
    return {
      ...normalized,
      name: stringify(normalized.name),
      role: stringify(normalized.role),
      startDate: stringify(normalized.startDate),
      endDate: stringify(normalized.endDate),
      link: stringify(normalized.link) || stringify(normalized.url),
    };
  };
  const normalizeNamedDateEntry = (entry: any, prefix: string, index: number) => {
    if (typeof entry === 'string') {
      return { id: `${prefix}-${index + 1}`, name: entry, date: '' };
    }
    return {
      ...entry,
      id: stringify(entry?.id) || `${prefix}-${index + 1}`,
      name: stringify(entry?.name),
      date: stringify(entry?.date),
    };
  };

  return {
    personalInfo: {
      fullName: personalInfo.fullName ?? '',
      phone: personalInfo.phone ?? '',
      email: personalInfo.email ?? '',
      photoUrl: personalInfo.photoUrl ?? '',
      photoStyle: personalInfo.photoStyle,
      jobStatus: personalInfo.jobStatus ?? '',
      jobTarget: personalInfo.jobTarget ?? '',
      location: personalInfo.location ?? '',
      displayMode: personalInfo.displayMode ?? 'icon',
      photoLayout: personalInfo.photoLayout ?? 'right',
      hiddenFields: personalInfo.hiddenFields ?? [],
      fieldOrder: personalInfo.fieldOrder ?? undefined,
      customFields: personalInfo.customFields ?? {},
      iconMap: personalInfo.iconMap ?? {},
      fieldLabels: personalInfo.fieldLabels ?? {},
    },
    summary: source.summary ?? '',
    education: source.education ?? [],
    skills: Array.isArray(source.skills)
      ? (source.skills as unknown as string[]).map((item, index) => `${index + 1}. ${item}`).join('\n')
      : (source.skills ?? ''),
    workExperience: (source.workExperience ?? []).map(normalizeWorkEntry) as ResumeData['workExperience'],
    projects: (source.projects ?? []).map(normalizeProjectEntry) as ResumeData['projects'],
    honors: (source.honors ?? []).map((entry, index) => normalizeNamedDateEntry(entry, 'honor', index)) as ResumeData['honors'],
    certifications: (source.certifications ?? []).map((entry, index) => normalizeNamedDateEntry(entry, 'certification', index)) as ResumeData['certifications'],
    portfolio: source.portfolio ?? [],
    customSections: source.customSections ?? [],
    sectionOrder: source.sectionOrder ?? DEFAULT_SECTION_ORDER,
    sectionTitles: source.sectionTitles ?? {},
    hiddenSections: source.hiddenSections ?? [],
  };
}

function normalizeThemeSettings(theme?: ThemeSettings, suppressWatermark = true): ThemeSettings {
  const raw = (theme ?? {}) as ThemeSettings & Record<string, unknown>;
  const rawWatermark = (raw.watermark ?? {}) as Partial<ThemeSettings['watermark']>;
  const watermark = {
    ...DEFAULT_THEME.watermark,
    ...rawWatermark,
  };

  return {
    layoutId: (raw.layoutId ?? raw.layout_id ?? DEFAULT_THEME.layoutId) as string,
    colorTheme: (raw.colorTheme ?? raw.color_theme ?? DEFAULT_THEME.colorTheme) as ThemeSettings['colorTheme'],
    customColors: (raw.customColors ?? raw.custom_colors ?? DEFAULT_THEME.customColors) as ThemeSettings['customColors'],
    fontFamily: (raw.fontFamily ?? raw.font_family ?? DEFAULT_THEME.fontFamily) as string,
    pageMargin: (raw.pageMargin ?? raw.page_margin ?? DEFAULT_THEME.pageMargin) as number,
    lineSpacing: (raw.lineSpacing ?? raw.line_spacing ?? DEFAULT_THEME.lineSpacing) as number,
    fontSize: (raw.fontSize ?? raw.font_size ?? DEFAULT_THEME.fontSize) as number,
    sectionTitleFontSize: (raw.sectionTitleFontSize ?? raw.section_title_font_size ?? DEFAULT_THEME.sectionTitleFontSize) as number,
    entryTitleFontSize: (raw.entryTitleFontSize ?? raw.entry_title_font_size ?? DEFAULT_THEME.entryTitleFontSize) as number,
    titleLayout: (raw.titleLayout ?? raw.title_layout ?? DEFAULT_THEME.titleLayout) as ThemeSettings['titleLayout'],
    watermark: suppressWatermark ? { ...watermark, enabled: false } : watermark,
  };
}

function buildDefaultUI(theme?: ThemeSettings, suppressWatermark = true): AppUIState {
  // 默认用于卡片预览时禁用水印（缩放后无法看清且干扰视觉）。
  // 分享页复用此 Provider，但需要保留真实水印配置。
  // 以 DEFAULT_THEME 为基础合并，确保 titleLayout 等缺失属性有正确的默认值
  // 这解决了当缓存/API 返回的旧版数据缺少新增字段时，卡片预览回退到意外默认布局的问题
  const cardTheme = normalizeThemeSettings(theme, suppressWatermark);
  return {
    activeSection: 'personal',
    zoom: 1,
    settingsOpen: false,
    editorOpen: false,
    theme: cardTheme,
    saveStatus: 'saved',
    saveTrigger: 0,
    lastSavedAt: null,
    drawerOpen: false,
    isSecondaryEditorOpen: false,
    resumeMeta: { id: null, name: '' },
    rightPanelTab: 'settings' as const,
    mobileDockMode: 'preview' as const,
  };
}

interface Props {
  content: ResumeData;
  theme?: ThemeSettings;
  suppressWatermark?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** 卡片预览专用 Context Provider */
export function ResumeCardPreviewProvider({ content, theme, suppressWatermark = true, className, children }: Props) {
  const normalizedContent = React.useMemo(
    () => normalizeResumeData(content),
    [content],
  );

  const resumeValue = React.useMemo(
    () => ({
      data: normalizedContent,
      dispatch: noopDispatch,
      dataReady: true,
      initialSettings: null as ThemeSettings | null,
    }),
    [normalizedContent],
  );

  const uiValue = React.useMemo(
    () => ({
      ui: buildDefaultUI(theme, suppressWatermark),
      uiDispatch: noopUIDispatch,
    }),
    [theme, suppressWatermark],
  );

  const reactScopeId = React.useId();

  // 为每个卡片预览实例生成稳定 scope class，隔离其 <style> 标签
  const scopeClass = React.useMemo(() => {
    return `cp-scope-${reactScopeId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  }, [reactScopeId]);

  return (
    <CardPreviewScopeContext.Provider value={scopeClass}>
      <div className={className ? `${scopeClass} ${className}` : scopeClass}>
        <ResumeContext.Provider value={resumeValue}>
          <AppUIContext.Provider value={uiValue}>
            <DiagnosisContext.Provider value={noopDiagnosis}>
              {children}
            </DiagnosisContext.Provider>
          </AppUIContext.Provider>
        </ResumeContext.Provider>
      </div>
    </CardPreviewScopeContext.Provider>
  );
}
