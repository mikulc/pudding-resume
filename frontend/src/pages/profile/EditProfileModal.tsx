import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { api } from '../../utils/api';
import { lockModalScroll } from '../../utils/modalScrollLock';
import type { UserProfile } from '../../types/auth';

// ========================
// Edit Profile Modal
// ========================

export function EditProfileModal({
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

  useEffect(() => {
    if (!open) return;
    return lockModalScroll();
  }, [open]);

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
              className="settings-input w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-[#425aef] focus:outline-none focus:ring-0 dark:focus:border-[#ffc848] dark:focus:ring-0"
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
              className="settings-input w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400"
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
