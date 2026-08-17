import { DEFAULT_THEME, DEFAULT_SECTION_ORDER, normalizePersonalInfo } from '../types/resume';
import type { ResumeData, ThemeSettings } from '../types/resume';
import { getLayoutDefaultColor, getLayoutDefaultPageMargin } from '../registry/layouts';

export function createEmptyResumeData(): ResumeData {
  return {
    personalInfo: normalizePersonalInfo(),
    summary: '',
    education: [],
    workExperience: [],
    projects: [],
    skills: '',
    honors: [],
    customSections: [],
    sectionConfig: {
      order: [...DEFAULT_SECTION_ORDER],
      titleOverrides: {},
      hidden: [],
    },
  };
}

export function createInitialThemeSettings(layoutId: string, themeColor?: string): ThemeSettings {
  const accentColor = themeColor ?? getLayoutDefaultColor(layoutId);
  const defaultPageMargin = getLayoutDefaultPageMargin(layoutId);
  const settings: ThemeSettings = {
    ...DEFAULT_THEME,
    layoutId,
    themeColor: accentColor,
    pageMargin: defaultPageMargin ?? DEFAULT_THEME.pageMargin,
    typography: { ...DEFAULT_THEME.typography },
    watermark: { ...DEFAULT_THEME.watermark },
    personalHeader: { ...DEFAULT_THEME.personalHeader },
  };

  return settings;
}
