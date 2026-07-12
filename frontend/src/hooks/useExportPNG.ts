import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResume, useAppUI } from '../context/ResumeContext';
import { useToast } from '../components/common/Toast';
import { exportResumeWithProgress } from '../api/export';
import { extractPNGSelfContainedHTML, collectDocumentStyles, processContinuousPNGPageHTML, wrapAsDocument } from '../utils/exportHTML';
import { getLayoutCSS } from '../registry/layouts';
import { generateExportFontCSS, waitForFontsReady } from '../config/fontRegistry';
import type { ExportProgressState } from '../types/export';
import {
  buildExportThemeCSS,
  createExportSnapshot,
  downloadExportBlob,
  sanitizeExportFileName,
} from '../utils/exportPipeline';

export function useExportPNG(previewRef: React.RefObject<HTMLDivElement>) {
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgressState | null>(null);
  const progressHideTimerRef = useRef<number | null>(null);
  const { data: resumeData } = useResume();
  const { ui } = useAppUI();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation(['resume', 'editor']);

  const scheduleHideProgress = useCallback((delay: number) => {
    if (progressHideTimerRef.current !== null) {
      window.clearTimeout(progressHideTimerRef.current);
    }
    progressHideTimerRef.current = window.setTimeout(() => {
      setExportProgress(null);
      progressHideTimerRef.current = null;
    }, delay);
  }, []);

  const exportPNG = useCallback(async (resumeId?: string) => {
    if (!resumeData) {
      console.warn('No resume data to export');
      return;
    }

    if (progressHideTimerRef.current !== null) {
      window.clearTimeout(progressHideTimerRef.current);
      progressHideTimerRef.current = null;
    }

    const setProgress = (progress: number, message: string, stage?: string) => {
      setExportProgress({
        active: true,
        format: 'png',
        status: 'running',
        progress,
        message,
        stage,
      });
    };
    const getServerProgressMessage = (stage?: string, serverMessage?: string) => {
      const localizedMessage = (() => {
        switch (stage) {
          case 'connected':
          case 'queued':
            return t('editor:export.progressConnected');
          case 'prepare':
            return t('editor:export.progressServerPrepare');
          case 'fonts':
            return t('editor:export.progressServerFonts');
          case 'page':
            return t('editor:export.progressServerPage');
          case 'render':
            return t('editor:export.progressRenderingPng');
          case 'download':
            return t('editor:export.progressDownload');
          default:
            return t('editor:export.progressRenderingPng');
        }
      })();

      return i18n.language.toLowerCase().startsWith('zh')
        ? serverMessage || localizedMessage
        : localizedMessage;
    };

    setIsExportingPNG(true);
    setProgress(4, t('editor:export.progressPreparePng'), 'prepare');

    try {
      const container = previewRef.current;
      if (!container) {
        throw new Error(t('export.previewNotFound'));
      }

      await waitForFontsReady();
      setProgress(12, t('editor:export.progressFontsReady'), 'fonts');

      const fontCSS = generateExportFontCSS(ui.theme.fontFamily);
      const { snapshot, dispose } = createExportSnapshot(container);
      setProgress(18, t('editor:export.progressClone'), 'clone');

      try {
        const layoutCSS = getLayoutCSS(ui.theme.layoutId);
        const documentStyles = collectDocumentStyles(layoutCSS, buildExportThemeCSS(ui.theme));
        const papers = snapshot.querySelectorAll<HTMLElement>('.resume-paper');
        let html: string;

        if (papers.length > 1) {
          const paperBodies: string[] = [];
          const paperList = Array.from(papers);
          for (let index = 0; index < paperList.length; index += 1) {
            paperBodies.push(await processContinuousPNGPageHTML(paperList[index], index, paperList.length, ui.theme.watermark));
            setProgress(
              Math.min(28, 20 + Math.round(((index + 1) / paperList.length) * 8)),
              t('editor:export.progressProcessPage', { current: index + 1, total: paperList.length }),
              'html',
            );
          }
          html = wrapAsDocument(paperBodies.join(''), documentStyles, fontCSS);
        } else {
          html = await extractPNGSelfContainedHTML(snapshot, documentStyles, fontCSS);
          setProgress(28, t('editor:export.progressBuildPage'), 'html');
        }

        const resumeName = sanitizeExportFileName(ui.resumeMeta?.name, t('list.unnamedResume'));
        setProgress(30, t('editor:export.progressUpload'), 'upload');

        const { blob, fontTimedOut } = await exportResumeWithProgress(
          'png',
          html,
          resumeName,
          resumeId,
          (event) => {
            if (event.type !== 'progress') return;
            const serverProgress = typeof event.progress === 'number' ? event.progress : 0;
            setProgress(
              Math.min(98, 30 + Math.round(serverProgress * 0.68)),
              getServerProgressMessage(event.stage, event.message),
              event.stage,
            );
          },
        );

        downloadExportBlob(blob, `${resumeName}.png`);

        if (fontTimedOut) {
          showToast(t('export.fontLoadTimeout', { format: 'PNG' }), 'error');
        }

        setExportProgress({
          active: true,
          format: 'png',
          status: 'success',
          progress: 100,
          message: t('editor:export.progressCompletePng'),
          stage: 'complete',
        });
        scheduleHideProgress(2600);
      } finally {
        dispose();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : t('export.pngFailed');
      setExportProgress({
        active: true,
        format: 'png',
        status: 'error',
        progress: 100,
        message,
        stage: 'error',
      });
      scheduleHideProgress(4200);
      showToast(message, 'error');
    } finally {
      setIsExportingPNG(false);
    }
  }, [i18n.language, previewRef, resumeData, scheduleHideProgress, showToast, t, ui]);

  return { exportPNG, isExportingPNG, exportProgress };
}
