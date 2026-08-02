import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createResume, setResumeCache } from '../../api/resumes';
import { useToast } from '../common/Toast';
import { isLocalStorageEnabled } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/api';
import { generateLocalId, saveResumeToLocal } from '../../utils/localStorage';
import { setPreviewCache } from '../../utils/previewCache';
import {
  clearResumeLaunchSession,
  stageDraftResumeLaunch,
  stageLocalResumeLaunch,
} from '../../utils/resumeLaunch';
import { createEmptyResumeData, createInitialThemeSettings } from '../../utils/resumeDraft';
import { getLayoutDefaultColor } from '../../registry/layouts';
import type { TemplateLibraryEntry } from '../../types/resume';
import { removeUnavailableDefaultAvatar } from '../../utils/resumePhoto';

export function useCreateResumeFromTemplate() {
  const navigate = useNavigate();
  const { t } = useTranslation('resume');
  const { showToast } = useToast();
  const [creatingLayoutId, setCreatingLayoutId] = useState<string | null>(null);

  const createFromTemplate = useCallback(async (entry: TemplateLibraryEntry) => {
    if (creatingLayoutId) return;

    clearResumeLaunchSession();

    const layoutId = entry.defaultTheme.layoutId;
    const themeColor = entry.defaultTheme.previewColors?.accentBar || getLayoutDefaultColor(layoutId);
    const settings = createInitialThemeSettings(layoutId, themeColor);
    const resumeName = t('templatesPage.untitledResume');

    flushSync(() => setCreatingLayoutId(layoutId));

    try {
      const resumeData = await removeUnavailableDefaultAvatar(entry.content ?? createEmptyResumeData());

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
          throw new Error(t('templatesPage.saveFailed'));
        }

        stageLocalResumeLaunch({ id: localId, name: resumeName, data: resumeData, settings });
        setPreviewCache(localId, resumeData, settings);
        navigate(`/resume/${localId}`);
        return;
      }

      stageDraftResumeLaunch({ layoutId, themeColor, templateData: resumeData });
      navigate('/resume');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('templatesPage.saveFailed');
      showToast(message, 'error');
      setCreatingLayoutId(null);
    }
  }, [creatingLayoutId, navigate, showToast, t]);

  return { creatingLayoutId, createFromTemplate };
}
