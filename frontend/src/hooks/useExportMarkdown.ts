import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResume, useAppUI } from '../context/ResumeContext';
import { useToast } from '../components/common/Toast';
import { generateMarkdown } from '../utils/exportMarkdown';

export function useExportMarkdown() {
  const [isExporting, setIsExporting] = useState(false);
  const { data: resumeData } = useResume();
  const { ui } = useAppUI();
  const { showToast } = useToast();
  const { t } = useTranslation('resume');

  const exportMarkdown = useCallback(async () => {
    if (!resumeData) {
      console.warn('No resume data to export');
      return;
    }

    setIsExporting(true);
    try {
      const markdown = generateMarkdown(resumeData);

      // 使用简历名称作为文件名
      const filename = `${ui.resumeMeta.name || t('export.defaultFileName')}.md`;

      // 创建 Blob 并触发下载
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(t('export.markdownSuccess'), 'success');
    } catch (err) {
      console.error('Markdown export failed:', err);
      showToast(t('export.markdownFailed'), 'error');
    } finally {
      setIsExporting(false);
    }
  }, [resumeData, ui.resumeMeta.name, showToast, t]);

  return { exportMarkdown, isExportingMD: isExporting };
}
