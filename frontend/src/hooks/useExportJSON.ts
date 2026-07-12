import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResume, useAppUI } from '../context/ResumeContext';
import { useToast } from '../components/common/Toast';
import { isExportJsonWithSettingsEnabled } from '../context/AuthContext';
import type { ResumeData, SectionKey } from '../types/resume';

const SECTION_CONTENT_KEYS: Partial<Record<SectionKey, keyof ResumeData>> = {
  personal: 'personalInfo',
  education: 'education',
  work: 'workExperience',
  projects: 'projects',
  skills: 'skills',
  honors: 'honors',
  certifications: 'certifications',
  portfolio: 'portfolio',
  summary: 'summary',
};

function createOrderedResumeContent(data: ResumeData): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  const written = new Set<keyof ResumeData>();
  let customSectionsWritten = false;

  for (const section of data.sectionOrder ?? []) {
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

    ordered[key] = data[key];
    written.add(key);
  }

  const fallbackKeys: (keyof ResumeData)[] = [
    'personalInfo',
    'education',
    'workExperience',
    'projects',
    'skills',
    'honors',
    'certifications',
    'portfolio',
    'summary',
    'customSections',
  ];

  for (const key of fallbackKeys) {
    if (!written.has(key) && key in data) {
      ordered[key] = data[key];
      written.add(key);
    }
  }

  ordered.sectionOrder = data.sectionOrder;
  ordered.sectionTitles = data.sectionTitles;
  ordered.hiddenSections = data.hiddenSections;

  return ordered;
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
        exportPayload.settings = ui.theme;
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
