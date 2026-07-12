import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Callback to switch to login modal */
  onSwitchToLogin: () => void;
}

export function RegisterModal({ open, onClose, onSwitchToLogin }: Props) {
  const { register } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('auth');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      // Frontend validation
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();

      if (!trimmedUsername) {
        setError(t('register.usernameRequired'));
        return;
      }
      if (trimmedUsername.length < 2 || trimmedUsername.length > 10) {
        setError(t('register.usernameLength'));
        return;
      }
      if (!trimmedEmail) {
        setError(t('register.emailRequired'));
        return;
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
        setError(t('register.invalidEmail'));
        return;
      }
      if (!password) {
        setError(t('register.passwordRequired'));
        return;
      }
      if (password.length < 6) {
        setError(t('register.passwordLength'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('register.passwordMismatch'));
        return;
      }

      setLoading(true);
      try {
        await register({ username: trimmedUsername, email: trimmedEmail, password });
        showToast(t('register.registerSuccess'), 'success');
        reset();
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('register.registerFailed');
        setError(msg);
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
    },
    [username, email, password, confirmPassword, register, reset, onClose, t, showToast],
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[420px] max-w-[90vw] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={t('common:button.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('register.title')}</h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label htmlFor="register-username" className="block text-sm font-medium text-gray-700 mb-1.5">{t('register.username')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('register.usernamePlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1.5">{t('register.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('register.emailPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1.5">{t('register.password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('register.passwordPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">{t('register.confirmPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="register-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('register.confirmPasswordPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? t('register.loading') : t('register.submit')}
          </button>
        </form>

        {/* Switch to login */}
        <p className="mt-5 text-center text-sm text-gray-500">
          {t('register.hasAccount')}{' '}
          <button
            onClick={() => {
              reset();
              onSwitchToLogin();
            }}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {t('register.login')}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}
