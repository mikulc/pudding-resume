import { useEffect, useCallback, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, FileText, Loader2, X } from 'lucide-react';
import { DEFAULT_LAYOUT_ID } from '../../config/defaults';
import { getLayoutDefaultColor } from '../../registry/layouts';
import { buildResumePreviewTheme } from '../layout/ResumeThemePicker';
import { useResumeTemplateLibrary } from '../template/ResumeTemplateLibrary';
import { ResumeCardPreview } from '../preview/ResumeCardPreview';
import { getAuthToken } from '../../utils/api';
import { createResume, setResumeCache } from '../../api/resumes';
import { createEmptyResumeData, createInitialThemeSettings } from '../../utils/resumeDraft';
import { isLocalStorageEnabled } from '../../context/AuthContext';
import { generateLocalId, saveResumeToLocal } from '../../utils/localStorage';
import { setPreviewCache } from '../../utils/previewCache';
import {
  clearResumeLaunchSession,
  stageDraftResumeLaunch,
  stageLocalResumeLaunch,
} from '../../utils/resumeLaunch';
import { useToast } from '../common/Toast';
import { lockModalScroll } from '../../utils/modalScrollLock';
import { removeUnavailableDefaultAvatar } from '../../utils/resumePhoto';

interface CreateResumeModalProps {
  open: boolean;
  onClose: () => void;
}

type CreationMode = 'blank' | 'template';

export function CreateResumeModal({ open, onClose }: CreateResumeModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('resume');
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const { entries, loading } = useResumeTemplateLibrary(open && !isCreating);

  useEffect(() => {
    if (open) setIsCreating(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return lockModalScroll();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCreating, open, onClose]);

  const handleClose = useCallback(() => {
    if (!isCreating) onClose();
  }, [isCreating, onClose]);

  const handleCreate = useCallback(async (targetMode: CreationMode, templateId?: string) => {
    if (isCreating) return;

    const template = targetMode === 'template'
      ? entries.find((entry) => entry.id === templateId)
      : undefined;
    const layoutId = template?.defaultTheme.layoutId ?? DEFAULT_LAYOUT_ID;

    if (!layoutId) return;

    clearResumeLaunchSession();

    const themeColor = template?.defaultTheme.previewColors?.accentBar || getLayoutDefaultColor(layoutId);
    const settings = createInitialThemeSettings(layoutId, themeColor);
    const resumeName = t('list.unnamedResume');

    flushSync(() => setIsCreating(true));

    try {
      const resumeData = await removeUnavailableDefaultAvatar(template?.content ?? createEmptyResumeData());

      if (getAuthToken()) {
        const created = await createResume(resumeData, resumeName, settings);
        setResumeCache(created.id, {
          id: created.id,
          name: created.name,
          content: created.content || resumeData,
          settings: created.settings || settings,
        });
        navigate(`/resume/${created.id}`);
        return;
      }

      if (isLocalStorageEnabled()) {
        const localId = generateLocalId();
        const saved = await saveResumeToLocal({
          id: localId,
          name: resumeName,
          content: resumeData,
          settings,
          updated_at: new Date().toISOString(),
        });

        if (!saved) {
          throw new Error(t('list.saveFailedRetry'));
        }

        stageLocalResumeLaunch({ id: localId, name: resumeName, data: resumeData, settings });
        setPreviewCache(localId, resumeData, settings);
        navigate(`/resume/${localId}`);
        return;
      }

      stageDraftResumeLaunch({
        layoutId,
        themeColor,
        templateData: targetMode === 'template' ? resumeData : undefined,
      });
      navigate('/resume');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('list.saveFailedRetry');
      showToast(message, 'error');
      setIsCreating(false);
    }
  }, [entries, isCreating, navigate, showToast, t]);

  if (!open) return null;

  if (isCreating) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 dark:bg-[color:var(--bg-page)]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
          <span className="text-sm">{t('create.enteringEditor')}</span>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-[1060px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] animate-in fade-in zoom-in-95 duration-200 dark:bg-[color:var(--bg-card)] dark:shadow-[0_24px_70px_rgba(23,25,29,0.45)]">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-5 top-5 z-20 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
            aria-label={t('common:button.close')}
        >
          <X className="h-5 w-5" />
        </button>

        <header className="px-6 pb-4 pt-6 sm:px-8">
          <h2 className="text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100">{t('list.newResume')}</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('create.description')}</p>
        </header>

        <div className="create-resume-scrollbar flex-1 space-y-5 overflow-y-auto px-6 pb-3 sm:px-8">
          <section>
            <div
              onClick={() => handleCreate('blank')}
              className="resume-grid-card resume-blank-card group flex cursor-pointer flex-col gap-3 rounded-[22px] border border-slate-200/60 bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-500 transition-colors group-hover:bg-white group-hover:text-[#2248ff] dark:bg-white/[0.06] dark:text-gray-400 dark:group-hover:bg-white/[0.1] dark:group-hover:text-[#fbbf24]">
                <FileText className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="resume-card-title text-base font-semibold text-gray-900 dark:text-gray-100">{t('create.blank.title')}</h3>
                </div>
                <p className="mt-0.5 max-w-[520px] text-sm leading-5 text-gray-500 dark:text-gray-400">
                  {t('create.blank.description')}
                </p>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCreate('blank');
                }}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 text-sm font-semibold text-white transition-all hover:bg-[#2563EB] active:scale-[0.98] sm:min-w-[112px]"
              >
                {t('create.createNow')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('create.fromTemplate.title')}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('create.fromTemplate.description')}</p>
            </div>

            <div className="create-resume-scrollbar -mx-1 overflow-visible px-1 pb-2">
              {loading ? (
                <div className="flex min-h-[240px] items-center justify-center text-gray-400">
                  <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
                </div>
              ) : entries.length === 0 ? (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-400">
                  {t('create.fromTemplate.empty')}
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 md:grid-cols-[repeat(auto-fit,320px)]">
                  {entries.map((entry) => (
                    <button
                      key={`${entry.id}-${entry.version}`}
                      type="button"
                      onClick={() => handleCreate('template', entry.id)}
                      className="resume-grid-card overflow-hidden rounded-[22px] border border-slate-200/60 bg-white text-left shadow-[0_4px_20px_rgba(15,23,42,0.04)] dark:border-[rgba(145,152,161,0.14)] dark:bg-[color:var(--bg-card)]"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                        <ResumeCardPreview
                          content={entry.content}
                          theme={buildResumePreviewTheme(entry.defaultTheme)}
                        />
                      </div>
                      <div className="border-t border-gray-50 p-3">
                        <h4 className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                          {entry.name}
                        </h4>
                        <p className="mt-1 truncate text-xs text-gray-500">{entry.industry}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
