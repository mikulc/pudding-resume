import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, LockKeyhole, Mail, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { lockModalScroll } from '../../utils/modalScrollLock';
import { ApiError } from '../../utils/api';
import logo from '../../assets/logo.svg';
import { AuthThemeToggle } from './AuthThemeToggle';
import './login-experience.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

type RegisterInputField = 'username' | 'email' | 'password' | 'confirmPassword' | 'code';

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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegisterInputField, string>>>({});
  const [globalError, setGlobalError] = useState('');
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
    setFieldErrors({});
    setGlobalError('');
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return;
    const unlockScroll = lockModalScroll();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unlockScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, open]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const showError = useCallback((message: string, field?: RegisterInputField) => {
    if (field) {
      setFieldErrors({ [field]: message });
      setGlobalError('');
    } else {
      setGlobalError(message);
    }
  }, []);

  const handleSendCode = useCallback(async () => {
    setFieldErrors({});
    setGlobalError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showError(t('register.emailRequired'), 'email');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      showError(t('register.invalidEmail'), 'email');
      return;
    }
    if (registrationConfigStatus !== 'enabled') {
      showError(t('register.configUnavailable'));
      return;
    }
    setCodeSending(true);
    try {
      const response = await sendRegistrationCode(trimmedEmail);
      setCountdown(Math.max(1, response.retry_after || 60));
      showToast(t('register.codeSent'), 'success');
    } catch (caught) {
      const emailAlreadyRegistered = caught instanceof ApiError && caught.status === 409;
      const message = emailAlreadyRegistered
        ? t('register.emailTaken')
        : caught instanceof Error
          ? caught.message
          : t('register.codeSendFailed');
      showError(message, emailAlreadyRegistered ? 'email' : undefined);
      showToast(message, 'error');
    } finally {
      setCodeSending(false);
    }
  }, [email, registrationConfigStatus, sendRegistrationCode, showError, showToast, t]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setGlobalError('');
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) return showError(t('register.usernameRequired'), 'username');
    if (trimmedUsername.length < 2 || trimmedUsername.length > 10) {
      return showError(t('register.usernameLength'), 'username');
    }
    if (!trimmedEmail) return showError(t('register.emailRequired'), 'email');
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      return showError(t('register.invalidEmail'), 'email');
    }
    if (!password) return showError(t('register.passwordRequired'), 'password');
    if (password.length < 6) return showError(t('register.passwordLength'), 'password');
    if (password !== confirmPassword) return showError(t('register.passwordMismatch'), 'confirmPassword');
    if (registrationEmailCodeEnabled && !/^\d{6}$/.test(code.trim())) {
      return showError(t('register.codeRequired'), 'code');
    }
    if (registrationConfigStatus === 'loading' || registrationConfigStatus === 'error') {
      return showError(t('register.configUnavailable'));
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
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t('register.registerFailed');
      showError(message);
      showToast(message, 'error');
      setLoading(false);
    }
  }, [
    code, confirmPassword, email, onClose, password, register, registrationConfigStatus,
    registrationEmailCodeEnabled, registrationTicket, reset, showError, showToast, t,
    ticketEmail, username, verifyRegistrationCode,
  ]);

  if (!open) return null;

  return createPortal(
    <div className="pudding-login-shell" role="dialog" aria-modal="true" aria-label={t('register.title')}>
      <section className="pudding-login-panel pudding-register-panel">
        <div className="pudding-login-form-wrap pudding-register-form-wrap">
          <AuthThemeToggle />
          <header className="pudding-login-header pudding-login-header--centered pudding-register-header">
            <img className="pudding-login-logo" src={logo} alt="Pudding Resume" />
            <p>{t('register.welcomeDescription')}</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="pudding-register-grid">
              <div className="pudding-register-field">
                <label className="pudding-login-label" htmlFor="register-username">{t('register.username')}</label>
                <div className={`pudding-login-input pudding-register-input ${fieldErrors.username ? 'is-error' : ''}`}>
                  <User aria-hidden="true" />
                  <input
                    id="register-username"
                    name="nickname"
                    type="text"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setFieldErrors((current) => ({ ...current, username: undefined }));
                    }}
                    placeholder={t('register.usernamePlaceholder')}
                    autoComplete="off"
                    aria-invalid={Boolean(fieldErrors.username)}
                    aria-describedby="register-username-error"
                  />
                </div>
                <div id="register-username-error" className="pudding-field-error">
                  {fieldErrors.username || '\u00a0'}
                </div>
              </div>

              <div className="pudding-register-field">
                <label className="pudding-login-label" htmlFor="register-email">{t('register.email')}</label>
                <div className={`pudding-login-input pudding-register-input ${fieldErrors.email ? 'is-error' : ''}`}>
                  <Mail aria-hidden="true" />
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setCode('');
                      setCountdown(0);
                      setRegistrationTicket('');
                      setTicketEmail('');
                      setFieldErrors((current) => ({ ...current, email: undefined }));
                    }}
                    placeholder={t('register.emailPlaceholder')}
                    autoComplete="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby="register-email-error"
                  />
                </div>
                <div id="register-email-error" className="pudding-field-error">
                  {fieldErrors.email || '\u00a0'}
                </div>
              </div>
            </div>

            {registrationEmailCodeEnabled && (
              <div className="pudding-register-field pudding-register-code-field">
                <label className="pudding-login-label" htmlFor="register-code">{t('register.code')}</label>
                <div className="pudding-register-code-row">
                  <div className={`pudding-login-input pudding-register-input ${fieldErrors.code ? 'is-error' : ''}`}>
                    <ShieldCheck aria-hidden="true" />
                    <input
                      id="register-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(event) => {
                        setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                        setRegistrationTicket('');
                        setTicketEmail('');
                        setFieldErrors((current) => ({ ...current, code: undefined }));
                      }}
                      placeholder={t('register.codePlaceholder')}
                      autoComplete="one-time-code"
                      aria-invalid={Boolean(fieldErrors.code)}
                      aria-describedby="register-code-error"
                    />
                  </div>
                  <button
                    className="pudding-register-code-button"
                    type="button"
                    onClick={handleSendCode}
                    disabled={codeSending || countdown > 0}
                  >
                    {codeSending
                      ? t('register.codeSending')
                      : countdown > 0
                        ? t('register.codeCountdown', { seconds: countdown })
                        : t('register.sendCode')}
                    </button>
                </div>
                <div id="register-code-error" className="pudding-field-error">
                  {fieldErrors.code || '\u00a0'}
                </div>
              </div>
            )}

            <div className="pudding-register-grid">
              <div className="pudding-register-field">
                <label className="pudding-login-label" htmlFor="register-password">{t('register.password')}</label>
                <div className={`pudding-login-input pudding-register-input ${fieldErrors.password ? 'is-error' : ''}`}>
                  <LockKeyhole aria-hidden="true" />
                  <input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFieldErrors((current) => ({ ...current, password: undefined }));
                    }}
                    placeholder={t('register.passwordPlaceholder')}
                    autoComplete="new-password"
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby="register-password-error"
                  />
                </div>
                <div id="register-password-error" className="pudding-field-error">
                  {fieldErrors.password || '\u00a0'}
                </div>
              </div>

              <div className="pudding-register-field">
                <label className="pudding-login-label" htmlFor="register-confirm-password">{t('register.confirmPassword')}</label>
                <div className={`pudding-login-input pudding-register-input ${fieldErrors.confirmPassword ? 'is-error' : ''}`}>
                  <LockKeyhole aria-hidden="true" />
                  <input
                    id="register-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
                    }}
                    placeholder={t('register.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby="register-confirm-password-error"
                  />
                </div>
                <div id="register-confirm-password-error" className="pudding-field-error">
                  {fieldErrors.confirmPassword || '\u00a0'}
                </div>
              </div>
            </div>

            {registrationConfigStatus === 'loading' && (
              <div className="pudding-register-notice">{t('register.configLoading')}</div>
            )}
            {registrationConfigStatus === 'error' && (
              <div className="pudding-register-notice is-error">{t('register.configUnavailable')}</div>
            )}

            <div className={`pudding-login-error ${globalError ? 'is-visible' : ''}`} role="alert">
              {globalError || '\u00a0'}
            </div>

            <button
              className="pudding-login-submit pudding-login-submit--login"
              type="submit"
              disabled={loading || registrationConfigStatus === 'loading' || registrationConfigStatus === 'error'}
            >
              <span>{loading ? t('register.loading') : t('register.submit')}</span>
              {loading && <Loader2 className="pudding-login-spinner" />}
            </button>
          </form>

          <p className="pudding-login-register">
            {t('register.hasAccount')}{' '}
            <button type="button" onClick={() => { reset(); onSwitchToLogin(); }}>
              {t('register.login')}
            </button>
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}
