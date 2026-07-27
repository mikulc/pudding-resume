import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, ShieldCheck, User, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Callback to switch to login modal */
  onSwitchToLogin: () => void;
}

export function RegisterModal({ open, onClose, onSwitchToLogin }: Props) {
  const {
    register,
    registrationEmailCodeEnabled,
    registrationConfigStatus,
    sendRegistrationCode,
    verifyRegistrationCode,
  } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('auth');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [registrationTicket, setRegistrationTicket] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setCodeSending(false);
    setCountdown(0);
    setRegistrationTicket('');
    setTicketEmail('');
    setError('');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('register.emailRequired'));
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      setError(t('register.invalidEmail'));
      return;
    }
    if (registrationConfigStatus !== 'enabled') {
      setError(t('register.configUnavailable'));
      return;
    }
    setCodeSending(true);
    try {
      const response = await sendRegistrationCode(trimmedEmail);
      setCountdown(Math.max(1, response.retry_after || 60));
      showToast(t('register.codeSent'), 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('register.codeSendFailed');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setCodeSending(false);
    }
  }, [
    email,
    registrationConfigStatus,
    sendRegistrationCode,
    showToast,
    t,
  ]);

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
      if (registrationEmailCodeEnabled && !/^\d{6}$/.test(code.trim())) {
        setError(t('register.codeRequired'));
        return;
      }
      if (registrationConfigStatus === 'loading' || registrationConfigStatus === 'error') {
        setError(t('register.configUnavailable'));
        return;
      }

      setLoading(true);
      try {
        let ticket = registrationTicket;
        if (registrationEmailCodeEnabled && (!ticket || ticketEmail !== trimmedEmail.toLowerCase())) {
          const verified = await verifyRegistrationCode(trimmedEmail, code.trim());
          ticket = verified.registration_ticket;
          setRegistrationTicket(ticket);
          setTicketEmail(trimmedEmail.toLowerCase());
        }
        await register({
          username: trimmedUsername,
          email: trimmedEmail,
          password,
          ...(registrationEmailCodeEnabled ? { registration_ticket: ticket } : {}),
        });
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
    [
      username,
      email,
      password,
      confirmPassword,
      code,
      registrationConfigStatus,
      registrationTicket,
      ticketEmail,
      registrationEmailCodeEnabled,
      register,
      verifyRegistrationCode,
      reset,
      onClose,
      t,
      showToast,
    ],
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
        className="relative bg-white rounded-2xl shadow-2xl w-[420px] max-w-[90vw] max-h-[90vh] overflow-y-auto p-8"
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setCode('');
                  setCountdown(0);
                  setRegistrationTicket('');
                  setTicketEmail('');
                }}
                placeholder={t('register.emailPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                autoComplete="email"
              />
            </div>
          </div>

          {registrationEmailCodeEnabled && (
            <div>
              <label htmlFor="register-code" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('register.code')}
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="register-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setRegistrationTicket('');
                      setTicketEmail('');
                    }}
                    placeholder={t('register.codePlaceholder')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    autoComplete="one-time-code"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={codeSending || countdown > 0}
                  className="shrink-0 min-w-24 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {codeSending
                    ? t('register.codeSending')
                    : countdown > 0
                      ? t('register.codeCountdown', { seconds: countdown })
                      : t('register.sendCode')}
                </button>
              </div>
            </div>
          )}

          {registrationConfigStatus === 'loading' && (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              {t('register.configLoading')}
            </div>
          )}
          {registrationConfigStatus === 'error' && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {t('register.configUnavailable')}
            </div>
          )}

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
            disabled={loading || registrationConfigStatus === 'loading' || registrationConfigStatus === 'error'}
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
