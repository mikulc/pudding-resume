import { DEFAULT_THEME, DEFAULT_SECTION_ORDER, deriveCustomColors } from '../types/resume';
import type { ResumeData, ThemeSettings } from '../types/resume';
import { getLayoutDefaultColor, getLayoutDefaultPageMargin } from '../registry/layouts';

export function createEmptyResumeData(): ResumeData {
  return {
    personalInfo: {
      fullName: '',
      phone: '',
      email: '',
      photoUrl: '',
      jobStatus: '',
      jobTarget: '',
      location: '',
      fieldLabels: {},
    },
    summary: '',
    education: [],
    workExperience: [],
    projects: [],
    skills: '',
    honors: [],
    certifications: [],
    portfolio: [],
    customSections: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    sectionTitles: {},
    hiddenSections: [],
  };
}

export function createInitialThemeSettings(layoutId: string, themeColor?: string): ThemeSettings {
  const accentColor = themeColor ?? getLayoutDefaultColor(layoutId);
  const defaultPageMargin = getLayoutDefaultPageMargin(layoutId);
  const settings: ThemeSettings = {
    ...DEFAULT_THEME,
    layoutId,
    pageMargin: defaultPageMargin ?? DEFAULT_THEME.pageMargin,
    customColors: DEFAULT_THEME.customColors ? { ...DEFAULT_THEME.customColors } : undefined,
    watermark: { ...DEFAULT_THEME.watermark },
  };

  settings.colorTheme = 'custom';
  settings.customColors = deriveCustomColors(accentColor);

  return settings;
}
