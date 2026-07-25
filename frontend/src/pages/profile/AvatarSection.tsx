import { useState, useRef, useEffect } from 'react';
import { User, Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { uploadAvatar } from '../../api/resumes';
import type { UserProfile } from '../../types/auth';

// --- File validation constants ---
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
type UploadStatus = 'idle' | 'preview' | 'uploading' | 'success' | 'error';

// ========================
// Avatar Upload Section
// ========================

export function AvatarSection({
  profile,
  onAvatarUpdate,
  t,
}: {
  profile: UserProfile;
  onAvatarUpdate: (profile: UserProfile) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset preview when profile changes (e.g. after successful upload)
  useEffect(() => {
    setPreviewUrl(null);
    setStatus('idle');
    setErrorMsg('');
  }, [profile.avatar]);

  const getAvatarUrl = (): string => {
    if (previewUrl) return previewUrl;
    if (profile.avatar) {
      // Relative path from server
      if (profile.avatar.startsWith('http')) return profile.avatar;
      const apiBase = import.meta.env.VITE_API_BASE || '';
      return `${apiBase}${profile.avatar}`;
    }
    return '';
  };

  const avatarUrl = getAvatarUrl();
  const showAvatar = previewUrl || avatarUrl;

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE) {
      return t('profile.avatarSizeLimit', { size: (file.size / 1024 / 1024).toFixed(1) });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      // Check extension as a fallback
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return t('profile.avatarFormatLimit');
      }
    }
    return null;
  };

  const uploadSelectedFile = async (file: File, localPreviewUrl: string) => {
    setStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await uploadAvatar(formData);

      URL.revokeObjectURL(localPreviewUrl);

      setStatus('success');
      showToast(t('profile.avatarUploadSuccess'), 'success');
      onAvatarUpdate({ ...profile, avatar: res.avatar_url });

      setTimeout(() => {
        setPreviewUrl(null);
        setStatus('idle');
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common:uploadFailed');
      setStatus('error');
      setErrorMsg(message);
      showToast(message, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const error = validateFile(file);
    if (error) {
      showToast(error, 'error');
      setStatus('error');
      setErrorMsg(error);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);
    setErrorMsg('');
    void uploadSelectedFile(file, url);
  };

  return (
    <div className="shrink-0">
      {/* Avatar display */}
      <div className="relative group">
        <div
          className={`h-20 w-20 overflow-hidden rounded-full border-2 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all duration-300 ${
            status === 'uploading'
              ? 'border-blue-300 animate-pulse'
              : status === 'success'
                ? 'border-emerald-400'
                : status === 'error'
                  ? 'border-red-400'
                  : 'border-slate-100 group-hover:border-blue-200 dark:border-white/10 dark:group-hover:border-blue-400/40'
          }`}
        >
          {showAvatar ? (
            <img
              src={showAvatar}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to default icon on load error
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          {!showAvatar && (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-violet-500/15">
              <User className="h-9 w-9 text-slate-300 dark:text-slate-500" />
            </div>
          )}
        </div>

        {/* Upload overlay on hover */}
        {status !== 'uploading' && (
          <button
            onClick={handleFileSelect}
            aria-label={profile.avatar ? t('profile.changeAvatar') : t('profile.uploadAvatar')}
            className="absolute inset-0 flex h-20 w-20 items-center justify-center rounded-full bg-black/0 transition-all duration-200 group-hover:bg-black/30"
          >
            <Camera className="h-5 w-5 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </button>
        )}

        {/* Status indicators */}
        {status === 'uploading' && (
          <div className="absolute inset-0 flex h-20 w-20 items-center justify-center rounded-full bg-black/30">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
        {status === 'success' && (
          <div className="absolute inset-0 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        id="avatar-file-input"
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {status === 'error' && errorMsg && (
        <p className="text-xs text-red-500 mt-3">{errorMsg}</p>
      )}
    </div>
  );
}

