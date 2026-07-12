import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, QrCode, Shield } from 'lucide-react';
import {
  getShareSettings,
  updateShareSettings,
  type ShareSettings,
} from '../../api/share';
import { useToast } from '../common/Toast';
import { QRCodePopover } from './QRCodeModal.js';
import { ShareSettingsModal } from './ShareSettingsModal.js';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface ShareDropdownProps {
  resumeId: string | null;
  compact?: boolean;
}

export function ShareDropdown({ resumeId, compact = false }: ShareDropdownProps) {
  const [open, setOpen] = useState(false);
  const [shareState, setShareState] = useState<ShareSettings | null>(null);
  const [shareLoadedResumeId, setShareLoadedResumeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQRPopover, setShowQRPopover] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const { t } = useTranslation('resume');
  const isLocal = resumeId?.startsWith('local-') ?? false;
  const isDisabled = !resumeId || loading;
  const hasLoadedShare = !!resumeId && shareLoadedResumeId === resumeId;

  // Reset cached share settings when switching resumes. Settings are loaded on
  // demand so opening the editor does not issue an extra request.
  useEffect(() => {
    setShareState(null);
    setShareLoadedResumeId(null);
    setLoading(false);
  }, [resumeId]);

  const loadShareSettings = async (): Promise<ShareSettings | null | undefined> => {
    if (!resumeId || isLocal) return null;
    if (hasLoadedShare) return shareState;

    setLoading(true);
    try {
      const res = await getShareSettings(resumeId);
      setShareState(res.share);
      setShareLoadedResumeId(resumeId);
      return res.share;
    } catch (err) {
      console.error('Failed to load share settings:', err);
      setShareState(null);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  // Reload share settings when settings modal opens, to ensure fresh data
  useEffect(() => {
    if (!showSettingsModal || !resumeId) return;
    getShareSettings(resumeId)
      .then((res) => {
        setShareState(res.share);
        setShareLoadedResumeId(resumeId);
      })
      .catch(() => {});
  }, [showSettingsModal, resumeId]);

  useOutsideClick({
    open: open || showQRPopover,
    refs: [containerRef],
    onOutsideClick: () => {
      setOpen(false);
      setShowQRPopover(false);
    },
  });

  // Close dropdown/popover on Escape
  useEffect(() => {
    if (!open && !showQRPopover) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowQRPopover(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, showQRPopover]);

  // Ensure share settings exist, creating with defaults if needed
  const ensureShare = async (): Promise<ShareSettings | null> => {
    if (!resumeId) return null;
    if (isLocal) {
      showToast(t('share.localResumeCannotShare'), 'info');
      return null;
    }
    const existingShare = await loadShareSettings();
    if (existingShare === undefined) {
      showToast(t('share.createFailed'), 'error');
      return null;
    }
    if (existingShare) return existingShare;

    try {
      const res = await updateShareSettings(resumeId, {
        permission: 'self_only',
        access_level: 'view',
        desensitized: false,
      });
      setShareState(res.share);
      setShareLoadedResumeId(resumeId);
      return res.share;
    } catch {
      showToast(t('share.createFailed'), 'error');
      return null;
    }
  };

  const handleCopyLink = async () => {
    setOpen(false);
    if (isLocal) {
      showToast(t('share.localResumeCannotCopyLink'), 'info');
      return;
    }
    const share = await ensureShare();
    if (!share) return;

    const url = `${window.location.origin}/resume/${share.resume_id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('share.linkCopied'), 'success');
    } catch {
      showToast(t('share.copyFailed'), 'error');
    }
  };

  const handleQRCode = async () => {
    setOpen(false);
    if (isLocal) {
      showToast(t('share.localResumeCannotShowQrCode'), 'info');
      return;
    }
    const share = await ensureShare();
    if (!share) return;
    setShowQRPopover(true);
  };

  const handleSettings = () => {
    setOpen(false);
    if (isLocal) {
      showToast(t('share.localResumeCannotConfigurePermissions'), 'info');
      return;
    }
    setShowSettingsModal(true);
  };

  const handleSettingsSaved = (updated: ShareSettings) => {
    setShareState(updated);
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      {/* Main button */}
      <button
        onClick={() => {
          if (isDisabled) return;
          setShowQRPopover(false);
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) {
            void loadShareSettings();
          }
        }}
        disabled={!resumeId}
        aria-disabled={isDisabled}
        data-open={(open || showQRPopover || showSettingsModal) ? 'true' : undefined}
        aria-label={t('share.title')}
        className={[
          'share-dropdown-trigger editor-action-button editor-action-button--secondary',
          loading ? 'cursor-progress' : '',
          compact ? 'editor-action-button--compact' : '',
        ].join(' ')}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {!compact && (
          <span className="editor-action-button__label-with-chevron">
            <span>{t('share.title')}</span>
            <svg
              className="editor-action-button__chevron"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-[14px] shadow-[0_10px_28px_rgba(15,23,42,0.10)] p-1.5 z-50 min-w-[150px] dark:bg-slate-950 dark:border-slate-800"
          style={{ animation: 'dropdown-appear 0.15s ease-out' }}
        >
          <style>{`
            @keyframes dropdown-appear {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <button
            onClick={handleCopyLink}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <Link className="w-4 h-4 text-blue-400 transition-colors group-hover/menu:text-blue-500 dark:group-hover/menu:text-blue-300" />
            <div className="text-left">
              <div className="font-medium">{t('share.copyLink')}</div>
            </div>
          </button>

          <button
            onClick={handleQRCode}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <QrCode className="w-4 h-4 text-purple-400 transition-colors group-hover/menu:text-purple-500 dark:group-hover/menu:text-purple-300" />
            <div className="text-left">
              <div className="font-medium">{t('share.qrCode')}</div>
            </div>
          </button>

          <button
            onClick={handleSettings}
            className="group/menu w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-sm text-gray-700 hover:bg-[rgba(34,72,255,0.06)] transition-colors dark:text-slate-200 dark:hover:bg-[rgba(34,72,255,0.14)]"
          >
            <Shield className="w-4 h-4 text-amber-500 transition-colors group-hover/menu:text-amber-600 dark:group-hover/menu:text-amber-300" />
            <div className="text-left">
              <div className="font-medium">{t('share.permissionSettings')}</div>
            </div>
          </button>
        </div>
      )}

      {/* QR Code Popover */}
      <QRCodePopover
        open={showQRPopover}
        shareState={shareState}
      />

      {/* Settings Modal */}
      <ShareSettingsModal
        open={showSettingsModal}
        resumeId={resumeId}
        shareState={shareState}
        onClose={() => setShowSettingsModal(false)}
        onSaved={handleSettingsSaved}
      />
    </div>
  );
}
