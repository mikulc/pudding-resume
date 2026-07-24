import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Camera,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Pencil,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Download,
  FileText,
  Infinity as InfinityIcon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import { api } from '../utils/api';
import { uploadAvatar } from '../api/resumes';
import type { UserProfile } from '../types/auth';

// --- File validation constants ---
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
type UploadStatus = 'idle' | 'preview' | 'uploading' | 'success' | 'error';

function formatQuotaNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('zh-CN').format(value ?? 0);
}

function quotaPercent(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

// ========================
// Avatar Upload Section
// ========================

function AvatarSection({
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

// ========================
// Edit Profile Modal
// ========================

function EditProfileModal({
  open,
  onClose,
  profile,
  onProfileUpdate,
}: {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
}) {
  const { showToast } = useToast();
  const { t } = useTranslation('auth');
  const [username, setUsername] = useState(profile.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setUsername(profile.username);
      setError('');
    }
  }, [open, profile.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Frontend validation
    if (!username.trim()) {
      setError(t('profile.usernameRequired'));
      return;
    }
    if (username.trim().length < 2) {
      setError(t('profile.usernameTooShort'));
      return;
    }
    if (username.trim().length > 10) {
      setError(t('profile.usernameTooLong'));
      return;
    }

    if (username.trim() === profile.username) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const updated = await api.put<UserProfile>('/api/user/profile', {
        username: username.trim(),
      });
      onProfileUpdate(updated);
      showToast(t('profile.updateSuccess'), 'success');
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('profile.updateFailed');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{t('profile.editProfile')}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Username field */}
          <div>
            <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('profile.username')}
            </label>
            <input
              id="edit-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              placeholder={t('profile.usernamePlaceholder')}
              autoFocus
              maxLength={10}
            />
            <p className="text-xs text-gray-400 mt-1">{t('profile.usernameHint')}</p>
          </div>

          {/* Email (read-only) */}
          <div>
            <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('profile.email')}
            </label>
            <input
              id="edit-email"
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">{t('profile.emailReadonly')}</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t('common:button.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('profile.saving')}
                </>
              ) : (
                t('profile.saveChanges')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================
// Change Password Modal
// ========================

function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const { t } = useTranslation('auth');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oldPassword) {
      setError(t('profile.passwordRequired'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('profile.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordMismatch'));
      return;
    }
    if (oldPassword === newPassword) {
      setError(t('profile.passwordSame'));
      return;
    }

    setSaving(true);
    try {
      await api.put('/api/user/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      showToast(t('profile.passwordChangeSuccess'), 'success');
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('profile.passwordChangeFailed');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{t('profile.changePasswordTitle')}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Old password */}
          <div>
            <label htmlFor="old-password" className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.oldPassword')}</label>
            <div className="relative">
              <input
                id="old-password"
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                placeholder={t('profile.oldPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.newPassword')}</label>
            <div className="relative">
              <input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                placeholder={t('profile.newPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.confirmPassword')}</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                placeholder={t('profile.confirmPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t('common:button.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('profile.updatingPassword')}
                </>
              ) : (
                t('common:confirmChange')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================
// Quota Card
// ========================

function QuotaPanel({ profile }: { profile: UserProfile }) {
  const { i18n } = useTranslation('auth');
  const isEnglish = i18n.language?.startsWith('en');
  const copy = isEnglish
    ? {
      title: 'Usage & quota', desc: 'A clear overview of your current plan', updated: 'Updated', unavailable: 'Not available',
      resume: 'Resume slots', export: 'Exports', token: 'AI Tokens', used: 'Used', remaining: 'Available', unlimited: 'Unlimited',
      daily: 'Daily limit', monthly: 'Monthly limit', unlimitedNote: 'AI Token usage is unlimited on your current plan', times: 'times',
    }
    : {
      title: '用量与额度', desc: '清晰掌握当前套餐的使用情况', updated: '更新于', unavailable: '暂无记录',
      resume: '简历额度', export: '导出次数', token: 'AI Token', used: '已使用', remaining: '可用', unlimited: '不限',
      daily: '每日额度', monthly: '每月额度', unlimitedNote: '当前套餐不限制 AI Token 使用', times: '次',
    };

  const maxResumes = profile.max_resumes ?? 0;
  const usedResumes = profile.used_resumes ?? 0;
  const resumesUnlimited = maxResumes <= 0;
  const remaining = Math.max(maxResumes - usedResumes, 0);
  const resumePercent = quotaPercent(usedResumes, maxResumes);
  const dailyLimit = profile.daily_limit_tokens ?? 0;
  const monthlyLimit = profile.monthly_limit_tokens ?? 0;
  const tokensUnlimited = dailyLimit <= 0 && monthlyLimit <= 0;
  const usage = profile as UserProfile & { daily_used_tokens?: number; monthly_used_tokens?: number };

  const overview = [
    {
      label: copy.resume,
      value: resumesUnlimited ? copy.unlimited : formatQuotaNumber(remaining),
      hint: resumesUnlimited ? copy.unlimited : `${copy.used} ${formatQuotaNumber(usedResumes)} / ${formatQuotaNumber(maxResumes)}`,
      icon: FileText,
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    },
    {
      label: copy.export,
      value: formatQuotaNumber(profile.export_count ?? 0),
      hint: copy.remaining,
      icon: Download,
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
      label: copy.token,
      value: tokensUnlimited ? copy.unlimited : formatQuotaNumber(Math.max(dailyLimit, monthlyLimit)),
      hint: tokensUnlimited ? copy.unlimitedNote : isEnglish ? 'Plan limit' : '套餐上限',
      icon: Sparkles,
      tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.055)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="flex flex-col gap-2 border-b border-[#EEF1F5] px-5 py-5 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h2 className="text-base font-semibold text-[#111827] dark:text-slate-50">{copy.title}</h2>
          <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">{copy.desc}</p>
        </div>
        <p className="shrink-0 text-xs text-[#94A3B8] dark:text-slate-500">{copy.updated} · {profile.quota_updated_at || copy.unavailable}</p>
      </div>

      <div className="p-5 sm:p-7">
        <div className="grid gap-3 md:grid-cols-3">
          {overview.map(({ label, value, hint, icon: Icon, tone }) => (
            <div key={label} className="group rounded-2xl border border-[#E9EDF3] bg-[#FAFBFC] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D7DEE8] hover:shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.16] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-slate-400">{label}</p>
                  <p className="mt-3 text-[30px] font-semibold leading-none tracking-tight tabular-nums text-[#111827] dark:text-white">{value}</p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-[18px] w-[18px]" /></div>
              </div>
              <p className="mt-3 min-h-4 truncate text-xs text-[#94A3B8] dark:text-slate-500">{hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#E9EDF3] p-5 dark:border-white/[0.08] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#111827] dark:text-slate-100">{copy.resume}</h3>
                <p className="mt-1 text-xs text-[#94A3B8] dark:text-slate-500">{resumesUnlimited ? copy.unlimitedNote : `${copy.used} ${formatQuotaNumber(usedResumes)} ${copy.times}`}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">{resumesUnlimited ? copy.unlimited : `${resumePercent}%`}</span>
            </div>
            {resumesUnlimited ? (
              <div className="mt-6 flex items-center gap-2 text-lg font-semibold text-blue-600 dark:text-blue-300"><InfinityIcon className="h-5 w-5" />{copy.unlimited}</div>
            ) : (
              <>
                <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-[#E9EFF7] dark:bg-white/[0.08]"><div className="h-full min-w-[3px] rounded-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${Math.max(resumePercent, usedResumes > 0 ? 0.5 : 0)}%` }} /></div>
                <div className="mt-3 flex justify-between text-xs text-[#64748B] dark:text-slate-400"><span>{copy.used} {formatQuotaNumber(usedResumes)}</span><span>{copy.remaining} {formatQuotaNumber(remaining)}</span></div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-[#E9EDF3] p-5 dark:border-white/[0.08] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div><h3 className="text-sm font-semibold text-[#111827] dark:text-slate-100">{copy.token}</h3><p className="mt-1 text-xs text-[#94A3B8] dark:text-slate-500">{tokensUnlimited ? copy.unlimitedNote : isEnglish ? 'Token usage limits' : 'Token 使用上限'}</p></div>
              <Sparkles className="h-4 w-4 text-violet-500" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[[copy.daily, dailyLimit, usage.daily_used_tokens], [copy.monthly, monthlyLimit, usage.monthly_used_tokens]].map(([label, limit, used]) => (
                <div key={label as string} className="rounded-xl bg-violet-50/60 px-3.5 py-3 dark:bg-violet-500/[0.08]">
                  <p className="text-xs text-[#64748B] dark:text-slate-400">{label as string}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-base font-semibold tabular-nums text-violet-600 dark:text-violet-300">{(limit as number) <= 0 ? <><InfinityIcon className="h-4 w-4" />{copy.unlimited}</> : typeof used === 'number' ? `${formatQuotaNumber(used as number)} / ${formatQuotaNumber(limit as number)}` : formatQuotaNumber(limit as number)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileInfo({
  profile,
  onAvatarUpdate,
  onEdit,
  onChangePassword,
}: {
  profile: UserProfile;
  onAvatarUpdate: (profile: UserProfile) => void;
  onEdit: () => void;
  onChangePassword: () => void;
}) {
  const { t, i18n } = useTranslation('auth');
  return (
    <section className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.055)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="relative p-5 sm:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-72 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_68%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_68%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <AvatarSection profile={profile} onAvatarUpdate={onAvatarUpdate} t={t} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-tight text-[#111827] dark:text-white">{profile.username}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{i18n.language?.startsWith('en') ? 'Active' : '账号正常'}</span>
            </div>
            <p className="mt-1.5 truncate text-sm text-[#64748B] dark:text-slate-400">{profile.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button onClick={onEdit} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#253044] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><Pencil className="h-4 w-4" />{t('profile.editProfile')}</button>
            <button onClick={onChangePassword} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E2E7EE] bg-white px-4 py-2 text-sm font-medium text-[#475569] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"><Lock className="h-4 w-4" />{t('profile.changePassword')}</button>
          </div>
        </div>
      </div>
      <div className="grid border-t border-[#EEF1F5] bg-[#FAFBFC] dark:border-white/[0.08] dark:bg-white/[0.02] sm:grid-cols-2">
        <div className="flex items-center gap-3 border-b border-[#EEF1F5] px-5 py-4 dark:border-white/[0.08] sm:border-b-0 sm:border-r sm:px-7"><Calendar className="h-[18px] w-[18px] shrink-0 text-blue-500" /><div><p className="text-xs text-[#94A3B8] dark:text-slate-500">{t('profile.registeredAt')}</p><p className="mt-1 text-sm font-medium tabular-nums text-[#334155] dark:text-slate-200">{profile.created_at}</p></div></div>
        <div className="flex items-center gap-3 border-b border-[#EEF1F5] px-5 py-4 dark:border-white/[0.08] sm:border-b-0 sm:px-7"><Clock className="h-[18px] w-[18px] shrink-0 text-violet-500" /><div><p className="text-xs text-[#94A3B8] dark:text-slate-500">{t('profile.lastLogin')}</p><p className="mt-1 text-sm font-medium tabular-nums text-[#334155] dark:text-slate-200">{profile.last_login_at || t('profile.noLoginRecord')}</p></div></div>
      </div>
    </section>
  );
}

// ========================
// Profile Page
// ========================

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isLoggedIn, profile, profileLoading, sessionLoading, setProfile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation('auth');
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  // Auth guard: redirect to home if not logged in
  useEffect(() => {
    if (!sessionLoading && !isLoggedIn) {
      showToast(t('profile.pleaseLogin'), 'error');
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, navigate, sessionLoading, showToast, t]);

  // Wait for silent session restore before deciding whether the user is logged in.
  if (sessionLoading || !isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[#111827] transition-colors duration-200 dark:text-slate-50">
      {/* ========== Header ========== */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-[var(--bg-header)] backdrop-blur-xl dark:border-white/5">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      {/* ========== Main Content ========== */}
      <main className="pb-16 pt-20 sm:pt-24">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6" data-global-toolbar-content>
          {/* Page title with back button */}
          <div className="mb-7 sm:mb-8">
            {/* Back button — mobile */}
            {/* Back button + title — desktop */}
            <h1 className="text-[28px] font-semibold tracking-tight text-[#111827] dark:text-slate-50 sm:text-[32px]">{i18n.language?.startsWith('en') ? 'Profile' : '个人中心'}</h1>
            <p className="mt-2 text-sm leading-6 text-[#64748B] dark:text-slate-400">{i18n.language?.startsWith('en') ? 'Manage your profile, account security, and quota in one place.' : '集中管理个人信息、账号安全和套餐用量。'}</p>
          </div>

          {/* Loading state */}
          {profileLoading && !profile && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
            </div>
          )}

          {/* Profile content */}
          {profile && (
            <div className="space-y-5 sm:space-y-6">
              <ProfileInfo
                profile={profile}
                onAvatarUpdate={(updatedProfile) => setProfile(updatedProfile)}
                onEdit={() => setEditOpen(true)}
                onChangePassword={() => setPasswordOpen(true)}
              />
              <QuotaPanel profile={profile} />
            </div>
          )}

          {/* Fallback: profile null but not loading (shouldn't normally happen) */}
          {!profileLoading && !profile && (
            <div className="text-center py-20">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('profile.cantLoadProfile')}</p>
              <button
                onClick={() => refreshProfile()}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {t('common:reload')}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profile={profile}
          onProfileUpdate={(updatedProfile) => {
            setProfile(updatedProfile);
          }}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}
