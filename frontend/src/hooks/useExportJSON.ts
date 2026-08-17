import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResume, useAppUI } from '../context/ResumeContext';
import { useToast } from '../components/common/Toast';
import { isExportJsonWithSettingsEnabled } from '../context/AuthContext';
import { normalizeFontFamilyId } from '../config/fonts';
import {
  normalizePersonalInfo,
  normalizeResumeEntryIds,
  normalizeSectionConfig,
  normalizeThemeSettings,
  resolveThemeColor,
  type ResumeData,
  type SectionKey,
  type ThemeSettings,
} from '../types/resume';

const SECTION_CONTENT_KEYS: Partial<Record<SectionKey, keyof ResumeData>> = {
  personal: 'personalInfo',
  education: 'education',
  work: 'workExperience',
  projects: 'projects',
  skills: 'skills',
  honors: 'honors',
  summary: 'summary',
};

function createExportContentValue(data: ResumeData, key: keyof ResumeData): unknown {
  if (key !== 'personalInfo') return data[key];
  return normalizePersonalInfo(data.personalInfo);
}

export function createOrderedResumeContent(data: ResumeData): Record<string, unknown> {
  const legacyData = data as unknown as Record<string, unknown>;
  data = normalizeResumeEntryIds({
    ...data,
    summary: typeof data.summary === 'string' ? data.summary : '',
    honors: Array.isArray(data.honors) ? data.honors : [],
    customSections: Array.isArray(data.customSections) ? data.customSections : [],
    sectionConfig: normalizeSectionConfig(data.sectionConfig, legacyData),
  });
  const ordered: Record<string, unknown> = {};
  const written = new Set<keyof ResumeData>();
  let customSectionsWritten = false;

  for (const section of data.sectionConfig.order) {
    if (section === 'custom') {
      ordered.customSections = data.customSections ?? [];
      customSectionsWritten = true;
      written.add('customSections');
      continue;
    }

    if (section.startsWith('custom-')) {
      if (!customSectionsWritten) {
        ordered.customSections = data.customSections ?? [];
        customSectionsWritten = true;
        written.add('customSections');
      }
      continue;
    }

    const key = SECTION_CONTENT_KEYS[section];
    if (!key || written.has(key)) continue;

    ordered[key] = createExportContentValue(data, key);
    written.add(key);
  }

  const fallbackKeys: (keyof ResumeData)[] = [
    'personalInfo',
    'education',
    'workExperience',
    'projects',
    'skills',
    'honors',
    'summary',
    'customSections',
  ];

  for (const key of fallbackKeys) {
    if (!written.has(key) && key in data) {
      ordered[key] = createExportContentValue(data, key);
      written.add(key);
    }
  }

  ordered.sectionConfig = {
    order: [...data.sectionConfig.order],
    titleOverrides: { ...data.sectionConfig.titleOverrides },
    hidden: [...data.sectionConfig.hidden],
  };

  return ordered;
}

export interface ExportThemeSettings {
  appearance: Pick<ThemeSettings, 'layoutId' | 'themeColor'>;
  typography: ThemeSettings['typography'];
  pageLayout: Pick<ThemeSettings, 'pageMargin' | 'entryTitleLayout'>;
  personalInfoLayout: ThemeSettings['personalHeader'];
  watermark: ThemeSettings['watermark'] | Pick<ThemeSettings['watermark'], 'enabled'>;
}

export function createExportThemeSettings(theme: ThemeSettings): ExportThemeSettings {
  const normalizedTheme = normalizeThemeSettings(theme);
  const settings = {
    appearance: {
      layoutId: normalizedTheme.layoutId,
      themeColor: resolveThemeColor(normalizedTheme),
    },
    typography: {
      ...normalizedTheme.typography,
      fontFamily: normalizeFontFamilyId(normalizedTheme.typography.fontFamily),
    },
    pageLayout: {
      pageMargin: normalizedTheme.pageMargin,
      entryTitleLayout: normalizedTheme.entryTitleLayout,
    },
    personalInfoLayout: { ...normalizedTheme.personalHeader },
    watermark: normalizedTheme.watermark.enabled
      ? { ...normalizedTheme.watermark }
      : { enabled: false },
  } satisfies ExportThemeSettings;
  return settings;
}

export function useExportJSON() {
  const [isExporting, setIsExporting] = useState(false);
  const { data: resumeData } = useResume();
  const { ui } = useAppUI();
  const { showToast } = useToast();
  const { t } = useTranslation('resume');

  const exportJSON = useCallback(async () => {
    if (!resumeData) {
      console.warn('No resume data to export');
      return;
    }

    setIsExporting(true);
    try {
      const exportPayload: Record<string, unknown> = {
        uuid: ui.resumeMeta.id,
        name: ui.resumeMeta.name || t('export.defaultFileName'),
        content: createOrderedResumeContent(resumeData),
      };
      // 根据用户偏好决定是否携带 settings 字段
      if (isExportJsonWithSettingsEnabled()) {
        exportPayload.settings = createExportThemeSettings(ui.theme);
      }
      const json = JSON.stringify(exportPayload, null, 2);

      // 使用简历名称作为文件名
      const filename = `${ui.resumeMeta.name || t('export.defaultFileName')}.json`;

      // 创建 Blob 并触发下载
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(t('export.jsonSuccess'), 'success');
    } catch (err) {
      console.error('JSON export failed:', err);
      showToast(t('export.jsonFailed'), 'error');
    } finally {
      setIsExporting(false);
    }
  }, [resumeData, ui.resumeMeta.id, ui.resumeMeta.name, ui.theme, showToast, t]);

  return { exportJSON, isExportingJSON: isExporting };
}
