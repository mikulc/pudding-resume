import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import EditorPage from './EditorPage';
import { SharedResumeView } from '../components/share/SharedResumeView';
import { ErrorAccessPage } from '../components/common/ErrorAccessPage';
import type { SharedResumeResponse } from '../api/share';
import { accessSharedResumeByResumeId } from '../api/share';
import { setResumeCache, getResumeById } from '../api/resumes';
import { useAuth } from '../context/AuthContext';

type ViewMode = 'loading' | 'owner' | 'shared' | 'error';
const LOGIN_REQUIRED_MESSAGE = String.fromCharCode(0x9700, 0x8981, 0x767b, 0x5f55);

export default function ResumePage() {
  const { resumeId } = useParams<{ resumeId?: string }>();
  const { isLoggedIn, sessionLoading } = useAuth();
  const { t } = useTranslation('resume');

  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [sharedData, setSharedData] = useState<SharedResumeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requireLogin, setRequireLogin] = useState(false);

  useLayoutEffect(() => {
    document.documentElement.classList.add('resume-route-fullscreen');
    document.body.classList.add('resume-route-fullscreen');

    return () => {
      document.documentElement.classList.remove('resume-route-fullscreen');
      document.body.classList.remove('resume-route-fullscreen');
    };
  }, []);

  const determineView = useCallback(async () => {
    // No resumeId: create new resume (owner mode)
    if (!resumeId) {
      setViewMode('owner');
      return;
    }

    // Local resume (sessionStorage-based): skip auth check, go straight to editor
    if (resumeId.startsWith('local-')) {
      setViewMode('owner');
      return;
    }

    if (sessionLoading) {
      setViewMode('loading');
      return;
    }

    setViewMode('loading');
    setError(null);
    setRequireLogin(false);

    // Logged-in owners should go straight through the private resume endpoint.
    // This avoids a noisy 404 from the public-share probe when the resume has
    // not been shared yet.
    if (isLoggedIn) {
      const ownResume = await getResumeById(resumeId);
      if (ownResume) {
        setResumeCache(ownResume.id, ownResume);
        setViewMode('owner');
        return;
      }
    }

    // Try public access (AuthOptional — works for owner, logged-in visitor, and anonymous)
    try {
      const data = await accessSharedResumeByResumeId(resumeId);

      // If current user is the owner, pre-populate cache so that EditorPage&#39;s
      // ResumeProvider can reuse the data without an extra network request
      if (data.is_owner) {
        setResumeCache(data.resume.id, data.resume);
      }

      setSharedData(data);

      // Only the owner edits the original resume. Editable shared resumes are
      // copied first from the preview page.
      if (data.is_owner) {
        setViewMode('owner');
      } else {
        setViewMode('shared');
      }
    } catch (err: any) {
      const msg = err?.message || t('cantLoadResume');
      if (msg.includes(LOGIN_REQUIRED_MESSAGE) || msg.includes('require_login')) {
        setRequireLogin(true);
      }
      setError(msg);
      setViewMode('error');
    }
  }, [isLoggedIn, resumeId, sessionLoading, t]);

  useEffect(() => {
    determineView();
  }, [determineView]);

  // Loading state
  if (viewMode === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
          <span className="text-sm text-gray-500">{t('loadResume')}</span>
        </div>
      </div>
    );
  }

  // Error state
  if (viewMode === 'error') {
    return (
      <ErrorAccessPage
        title={requireLogin ? t('requireLogin') : undefined}
        message={error || t('notPublic')}
      />
    );
  }

  // Shared view: non-owner visitor without edit permission
  if (viewMode === 'shared' && sharedData) {
    return <SharedResumeView data={sharedData} />;
  }

  // Owner or visitor with edit permission: full editor
  return <EditorPage />;
}
