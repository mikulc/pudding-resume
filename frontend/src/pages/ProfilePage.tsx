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
  Gauge,
  Infinity as InfinityIcon,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

const QUOTA_CHART_COLORS = {
  used: '#2563eb',
  remaining: '#dbeafe',
  unlimited: '#22c55e',
  daily: '#06b6d4',
  monthly: '#8b5cf6',
};

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
      title: 'Usage & quota', desc: 'View your current plan usage and remaining quota', updated: 'Last updated:', unavailable: 'Not available',
      resume: 'Resume creation', export: 'Resume exports', token: 'AI Tokens', used: 'Used', remaining: 'Remaining', unlimited: 'Unlimited',
      remainingTimes: 'remaining', daily: 'Daily quota', monthly: 'Monthly quota', unlimitedNote: 'Your current plan does not limit AI Token usage', limit: 'Token limit', times: 'times',
    }
    : {
      title: '用量与额度', desc: '查看当前套餐的使用情况和剩余额度', updated: '最后更新：', unavailable: '暂无记录',
      resume: '简历创建', export: '简历导出', token: 'AI Token', used: '已使用', remaining: '剩余', unlimited: '不限',
      remainingTimes: '剩余次数', daily: '每日额度', monthly: '每月额度', unlimitedNote: '当前套餐暂不限制 AI Token 使用', limit: '额度上限', times: '次',
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
    { label: copy.resume, value: resumesUnlimited ? copy.unlimited : formatQuotaNumber(remaining), hint: resumesUnlimited ? copy.unlimited : `${copy.used} ${formatQuotaNumber(usedResumes)} / ${formatQuotaNumber(maxResumes)}`, icon: FileText, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
    { label: copy.export, value: formatQuotaNumber(profile.export_count ?? 0), hint: copy.remainingTimes, icon: Download, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
    { label: copy.token, value: tokensUnlimited ? copy.unlimited : formatQuotaNumber(Math.max(dailyLimit, monthlyLimit)), hint: tokensUnlimited ? copy.unlimitedNote : copy.limit, icon: Sparkles, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  ];

  return (
    <section className="rounded-2xl border border-[#E8ECF2] bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-colors duration-200 dark:border-white/10 dark:bg-white/[0.045] sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-base font-semibold text-[#111827] dark:text-slate-50">{copy.title}</h2><p className="mt-1.5 text-sm text-[#64748B] dark:text-slate-400">{copy.desc}</p></div>
        <p className="text-xs text-[#94A3B8] dark:text-slate-500 sm:pt-0.5">{copy.updated}{profile.quota_updated_at || copy.unavailable}</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {overview.map(({ label, value, hint, icon: Icon, tone }) => <div key={label} className="min-h-[154px] rounded-xl border border-[#EEF1F5] bg-[#F8FAFC] p-4 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:hover:border-white/[0.16] dark:hover:bg-white/[0.055]"><div className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></div><p className="text-xs font-medium text-[#64748B] dark:text-slate-400">{label}</p><p className="mt-1.5 text-[26px] font-semibold leading-none tabular-nums text-[#111827] dark:text-slate-50">{value}</p><p className="mt-2 text-xs text-[#94A3B8] dark:text-slate-500">{hint}</p></div>)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#EEF1F5] bg-[#F8FAFC] p-5 dark:border-white/[0.08] dark:bg-white/[0.035]">
          <div className="flex items-center justify-between gap-4"><h3 className="text-sm font-semibold text-[#111827] dark:text-slate-100">{copy.resume}</h3><span className="text-xs font-medium text-blue-600 dark:text-blue-300">{resumesUnlimited ? copy.unlimited : `${resumePercent}%`}</span></div>
          {resumesUnlimited ? <p className="mt-5 flex items-center gap-2 text-sm text-[#64748B] dark:text-slate-400"><InfinityIcon className="h-5 w-5 text-blue-500" />{copy.unlimited}</p> : <><p className="mt-4 text-sm text-[#64748B] dark:text-slate-400">{copy.used} {formatQuotaNumber(usedResumes)} / {formatQuotaNumber(maxResumes)}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#DCE8F6] dark:bg-blue-950/50"><div className="h-full min-w-[2px] rounded-full bg-blue-600 dark:bg-blue-400" style={{ width: `${Math.max(resumePercent, usedResumes > 0 ? 0.5 : 0)}%` }} /></div><div className="mt-3 flex justify-between text-xs text-[#64748B] dark:text-slate-400"><span>{copy.used} {formatQuotaNumber(usedResumes)} {copy.times}</span><span>{copy.remaining} {formatQuotaNumber(remaining)} {copy.times}</span></div></>}
        </div>
        <div className="rounded-xl border border-[#EEF1F5] bg-[#F8FAFC] p-5 dark:border-white/[0.08] dark:bg-white/[0.035]">
          <h3 className="text-sm font-semibold text-[#111827] dark:text-slate-100">{copy.token}</h3>
          {tokensUnlimited ? <><div className="mt-4 grid gap-3 sm:grid-cols-2">{[copy.daily, copy.monthly].map((label) => <div key={label} className="rounded-lg border border-violet-100 bg-white/70 px-4 py-3 dark:border-violet-400/15 dark:bg-white/[0.035]"><p className="text-xs text-[#64748B] dark:text-slate-400">{label}</p><p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-violet-600 dark:text-violet-300"><InfinityIcon className="h-4 w-4" />{copy.unlimited}</p></div>)}</div><p className="mt-3 text-xs text-[#94A3B8] dark:text-slate-500">{copy.unlimitedNote}</p></> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{[[copy.daily, dailyLimit, usage.daily_used_tokens], [copy.monthly, monthlyLimit, usage.monthly_used_tokens]].map(([label, limit, used]) => { const hasUsage = typeof used === 'number'; const percent = hasUsage ? quotaPercent(used as number, limit as number) : 0; return <div key={label as string} className="rounded-lg border border-violet-100 bg-white/70 px-4 py-3 dark:border-violet-400/15 dark:bg-white/[0.035]"><p className="text-xs text-[#64748B] dark:text-slate-400">{label as string}</p><p className="mt-1 text-sm font-semibold tabular-nums text-[#111827] dark:text-slate-100">{hasUsage ? `${formatQuotaNumber(used as number)} / ${formatQuotaNumber(limit as number)} tokens` : `${copy.limit} ${formatQuotaNumber(limit as number)} tokens`}</p>{hasUsage && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950/50"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(percent, (used as number) > 0 ? 0.5 : 0)}%` }} /></div>}</div>; })}</div>}
        </div>
      </div>
    </section>
  );
}

function QuotaInfo({ profile }: { profile: UserProfile }) {
  return <QuotaPanel profile={profile} />;

  const { i18n } = useTranslation('auth');
  const isEnglish = i18n.language?.startsWith('en');
  const copy = isEnglish
    ? {
      title: 'Quota configuration',
      desc: 'Limits from user_quota',
      resume: 'Resume slots',
      export: 'Exports remaining',
      token: 'AI token limits',
      daily: 'Daily',
      monthly: 'Monthly',
      used: 'Used',
      remaining: 'Remaining',
      unlimited: 'Unlimited',
      quotaUpdated: 'Updated',
      noUpdate: 'Not recorded',
      barUnit: 'tokens',
    }
    : {
      title: '额度配置',
      desc: '来自 user_quota 表的当前配置',
      resume: '简历创建额度',
      export: '剩余导出次数',
      token: 'AI Token 额度',
      daily: '每日',
      monthly: '每月',
      used: '已用',
      remaining: '剩余',
      unlimited: '不限',
      quotaUpdated: '更新时间',
      noUpdate: '暂无记录',
      barUnit: 'tokens',
    };

  const maxResumes = profile.max_resumes ?? 0;
  const usedResumes = profile.used_resumes ?? 0;
  const resumeIsUnlimited = maxResumes <= 0;
  const resumeRemaining = Math.max(maxResumes - usedResumes, 0);
  const resumePercent = quotaPercent(usedResumes, maxResumes);
  const resumePieData = resumeIsUnlimited
    ? [{ name: copy.unlimited, value: 1, color: QUOTA_CHART_COLORS.unlimited }]
    : [
      { name: copy.used, value: Math.max(usedResumes, 0), color: QUOTA_CHART_COLORS.used },
      { name: copy.remaining, value: Math.max(resumeRemaining, 0), color: QUOTA_CHART_COLORS.remaining },
    ].filter((item) => item.value > 0);

  const dailyLimit = profile.daily_limit_tokens ?? 0;
  const monthlyLimit = profile.monthly_limit_tokens ?? 0;
  const maxTokenLimit = Math.max(dailyLimit, monthlyLimit, 1);
  const tokenQuotaData = [
    {
      name: copy.daily,
      value: dailyLimit,
      chartValue: dailyLimit > 0 ? dailyLimit : maxTokenLimit,
      color: QUOTA_CHART_COLORS.daily,
      label: dailyLimit > 0 ? formatQuotaNumber(dailyLimit) : copy.unlimited,
    },
    {
      name: copy.monthly,
      value: monthlyLimit,
      chartValue: monthlyLimit > 0 ? monthlyLimit : maxTokenLimit,
      color: QUOTA_CHART_COLORS.monthly,
      label: monthlyLimit > 0 ? formatQuotaNumber(monthlyLimit) : copy.unlimited,
    },
  ];

  const quotaItems = [
    {
      key: 'resume',
      label: copy.resume,
      value: resumeIsUnlimited ? copy.unlimited : `${formatQuotaNumber(usedResumes)} / ${formatQuotaNumber(maxResumes)}`,
      icon: FileText,
      colorClass: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'export',
      label: copy.export,
      value: formatQuotaNumber(profile.export_count ?? 0),
      icon: Download,
      colorClass: 'bg-amber-50 text-amber-600',
    },
    {
      key: 'token',
      label: copy.token,
      value: dailyLimit <= 0 && monthlyLimit <= 0 ? copy.unlimited : `${formatQuotaNumber(dailyLimit)} / ${formatQuotaNumber(monthlyLimit)}`,
      icon: Sparkles,
      colorClass: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <section className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
            <Gauge className="h-3.5 w-3.5" />
            user_quota
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">{copy.title}</h2>
          <p className="mt-1 text-sm text-[#6b7280]">{copy.desc}</p>
        </div>
        <div className="text-left text-xs text-gray-400 sm:text-right">
          <p>{copy.quotaUpdated}</p>
          <p className="mt-1 font-medium text-gray-600">{profile.quota_updated_at || copy.noUpdate}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {quotaItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${item.colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="mt-1 break-words text-lg font-bold tabular-nums text-gray-900">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="min-h-[220px]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{copy.resume}</h3>
            <span className="text-xs font-medium text-blue-600">{resumeIsUnlimited ? copy.unlimited : `${resumePercent}%`}</span>
          </div>
          <div className="relative h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resumePieData.length > 0 ? resumePieData : [{ name: copy.remaining, value: 1, color: QUOTA_CHART_COLORS.remaining }]}
                  dataKey="value"
                  innerRadius="68%"
                  outerRadius="88%"
                  paddingAngle={resumeIsUnlimited ? 0 : 4}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {(resumePieData.length > 0 ? resumePieData : [{ color: QUOTA_CHART_COLORS.remaining }]).map((entry, index) => (
                    <Cell key={`resume-quota-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold tabular-nums text-gray-900">
                {resumeIsUnlimited ? '∞' : formatQuotaNumber(resumeRemaining)}
              </p>
              <p className="mt-1 text-xs text-gray-400">{resumeIsUnlimited ? copy.unlimited : copy.remaining}</p>
            </div>
          </div>
          {!resumeIsUnlimited && (
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                {copy.used} {formatQuotaNumber(usedResumes)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-100" />
                {copy.remaining} {formatQuotaNumber(resumeRemaining)}
              </span>
            </div>
          )}
        </div>

        <div className="min-h-[220px]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{copy.token}</h3>
            <span className="text-xs text-gray-400">{copy.barUnit}</span>
          </div>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenQuotaData} layout="vertical" margin={{ top: 8, right: 42, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" horizontal={false} />
                <XAxis type="number" hide domain={[0, maxTokenLimit]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
                  formatter={(_, __, props) => [props.payload.label, props.payload.name]}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.10)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="chartValue" radius={[0, 10, 10, 0]} barSize={32}>
                  {tokenQuotaData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
            {tokenQuotaData.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold tabular-nums text-gray-800">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ========================
// Profile Info Card
// ========================

function ProfileInfo({
  profile,
  onEdit,
  onChangePassword,
}: {
  profile: UserProfile;
  onEdit: () => void;
  onChangePassword: () => void;
}) {
  const { t } = useTranslation('auth');
  return (
    <div>
      <section>
        <h3 className="text-base font-semibold text-[#111827] dark:text-slate-50">{t('profile.accountInfo')}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#EEF1F5] bg-[#F8FAFC] p-3.5 dark:border-white/[0.08] dark:bg-white/[0.035]"><div className="flex items-center gap-2 text-xs text-[#94A3B8] dark:text-slate-500"><Calendar className="h-4 w-4" />{t('profile.registeredAt')}</div><p className="mt-2 text-sm font-medium tabular-nums text-[#111827] dark:text-slate-200">{profile.created_at}</p></div>
          <div className="rounded-xl border border-[#EEF1F5] bg-[#F8FAFC] p-3.5 dark:border-white/[0.08] dark:bg-white/[0.035]"><div className="flex items-center gap-2 text-xs text-[#94A3B8] dark:text-slate-500"><Clock className="h-4 w-4" />{t('profile.lastLogin')}</div><p className="mt-2 text-sm font-medium tabular-nums text-[#111827] dark:text-slate-200">{profile.last_login_at || t('profile.noLoginRecord')}</p></div>
        </div>
      </section>
      <div className="my-6 border-t border-[#E8ECF2] dark:border-white/[0.08]" />
      <section>
        <h3 className="text-base font-semibold text-[#111827] dark:text-slate-50">{t('profile.securitySettings')}</h3>
        <button onClick={onChangePassword} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E8ECF2] bg-white px-4 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"><Lock className="h-4 w-4" />{t('profile.changePassword')}</button>
      </section>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Account Info Section */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('profile.accountInfo')}</h3>
        <div className="space-y-3">
          {/* Registration date */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t('profile.registeredAt')}</p>
              <p className="text-sm font-medium text-gray-700">{profile.created_at}</p>
            </div>
          </div>

          {/* Last login */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t('profile.lastLogin')}</p>
              <p className="text-sm font-medium text-gray-700">
                {profile.last_login_at || t('profile.noLoginRecord')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 my-4" />

      {/* Security Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('profile.securitySettings')}</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <Pencil className="w-4 h-4" />
            {t('profile.editProfile')}
          </button>
          <button
            onClick={onChangePassword}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-all"
          >
            <Lock className="w-4 h-4" />
            {t('profile.changePassword')}
          </button>
        </div>
      </div>
    </div>
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
      <main className="pb-16 pt-24 sm:pt-28">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6" data-global-toolbar-content>
          {/* Page title with back button */}
          <div className="mb-6">
            {/* Back button — mobile */}
            {/* Back button + title — desktop */}
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827] dark:text-slate-50">{i18n.language?.startsWith('en') ? 'Profile' : '个人中心'}</h1>
            <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">{i18n.language?.startsWith('en') ? 'Manage your profile, account security, and quota.' : '管理你的个人信息、账号安全和用量额度'}</p>
            {profile && <p className="mt-2 text-sm text-[#94A3B8] dark:text-slate-500">{t('profile.welcomeBack', { username: profile.username })}</p>}
          </div>

          {/* Loading state */}
          {profileLoading && !profile && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
            </div>
          )}

          {/* Profile content */}
          {profile && (
            <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)] xl:gap-6">
              {/* Profile Card */}
              <div className="rounded-2xl border border-[#E8ECF2] bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-colors duration-200 dark:border-white/10 dark:bg-white/[0.045] sm:p-7">
                <div>
                  <div className="flex items-start gap-4">
                    <AvatarSection
                      profile={profile}
                      onAvatarUpdate={(updatedProfile) => {
                        setProfile(updatedProfile);
                      }}
                      t={t}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold text-[#111827] dark:text-slate-50">{profile.username}</h2>
                      <p className="mt-1 truncate text-sm text-[#64748B] dark:text-slate-400">{profile.email}</p>
                      <button onClick={() => setEditOpen(true)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E8ECF2] bg-white px-3.5 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"><Pencil className="h-4 w-4" />{t('profile.editProfile')}</button>
                    </div>
                  </div>
                  <div className="mt-6 border-t border-[#E8ECF2] pt-6 dark:border-white/[0.08]">
                    <ProfileInfo
                      profile={profile}
                      onEdit={() => setEditOpen(true)}
                      onChangePassword={() => setPasswordOpen(true)}
                    />
                  </div>
                </div>
              </div>

              <QuotaInfo profile={profile} />
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
