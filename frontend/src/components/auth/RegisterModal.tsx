import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, LockKeyhole, Mail, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { lockModalScroll } from '../../utils/modalScrollLock';
import { AuthArtwork } from './LoginModal';
import './login-experience.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

type RegisterField = 'username' | 'email' | 'password' | 'confirmPassword' | 'code' | null;

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
  const [focusedField, setFocusedField] = useState<RegisterField>(null);
  const [reaction, setReaction] = useState<'idle' | 'success' | 'error'>('idle');
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
    setFocusedField(null);
    setReaction('idle');
    setError('');
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

  const showError = useCallback((message: string) => {
    setError(message);
    setReaction('error');
    window.setTimeout(() => setReaction('idle'), 560);
  }, []);

  const handleSendCode = useCallback(async () => {
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showError(t('register.emailRequired'));
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      showError(t('register.invalidEmail'));
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
      const message = caught instanceof Error ? caught.message : t('register.codeSendFailed');
      showError(message);
      showToast(message, 'error');
    } finally {
      setCodeSending(false);
    }
  }, [email, registrationConfigStatus, sendRegistrationCode, showError, showToast, t]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) return showError(t('register.usernameRequired'));
    if (trimmedUsername.length < 2 || trimmedUsername.length > 10) return showError(t('register.usernameLength'));
    if (!trimmedEmail) return showError(t('register.emailRequired'));
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      return showError(t('register.invalidEmail'));
    }
    if (!password) return showError(t('register.passwordRequired'));
    if (password.length < 6) return showError(t('register.passwordLength'));
    if (password !== confirmPassword) return showError(t('register.passwordMismatch'));
    if (registrationEmailCodeEnabled && !/^\d{6}$/.test(code.trim())) {
      return showError(t('register.codeRequired'));
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
      setFocusedField(null);
      setReaction('success');
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

  const artworkFocus = focusedField === 'password' || focusedField === 'confirmPassword'
    ? 'password'
    : focusedField
      ? 'email'
      : null;

  const focusHandlers = (field: RegisterField) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField(null),
  });

  return createPortal(
    <div className="pudding-login-shell" role="dialog" aria-modal="true" aria-labelledby="pudding-register-title">
      <button className="pudding-login-close" type="button" onClick={handleClose} aria-label={t('common:button.close')}>
        <X />
      </button>

      <AuthArtwork focusedField={artworkFocus} reaction={reaction} />

      <section className="pudding-login-panel pudding-register-panel">
        <div className="pudding-login-form-wrap pudding-register-form-wrap">
          <header className="pudding-login-header pudding-login-header--centered pudding-register-header">
            <h1 id="pudding-register-title">{t('register.welcomeTitle')}</h1>
            <p>{t('register.welcomeDescription')}</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="pudding-register-grid">
              <div>
                <label className="pudding-login-label" htmlFor="register-username">{t('register.username')}</label>
                <div className="pudding-login-input pudding-register-input">
                  <User aria-hidden="true" />
                  <input
                    id="register-username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder={t('register.usernamePlaceholder')}
                    autoComplete="username"
                    {...focusHandlers('username')}
                  />
                </div>
              </div>

              <div>
                <label className="pudding-login-label" htmlFor="register-email">{t('register.email')}</label>
                <div className="pudding-login-input pudding-register-input">
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
                    }}
                    placeholder={t('register.emailPlaceholder')}
                    autoComplete="email"
                    {...focusHandlers('email')}
                  />
                </div>
              </div>
            </div>

            {registrationEmailCodeEnabled && (
              <>
                <label className="pudding-login-label" htmlFor="register-code">{t('register.code')}</label>
                <div className="pudding-register-code-row">
                  <div className="pudding-login-input pudding-register-input">
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
                      }}
                      placeholder={t('register.codePlaceholder')}
                      autoComplete="one-time-code"
                      {...focusHandlers('code')}
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
              </>
            )}

            <div className="pudding-register-grid">
              <div>
                <label className="pudding-login-label" htmlFor="register-password">{t('register.password')}</label>
                <div className="pudding-login-input pudding-register-input">
                  <LockKeyhole aria-hidden="true" />
                  <input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('register.passwordPlaceholder')}
                    autoComplete="new-password"
                    {...focusHandlers('password')}
                  />
                </div>
              </div>

              <div>
                <label className="pudding-login-label" htmlFor="register-confirm-password">{t('register.confirmPassword')}</label>
                <div className="pudding-login-input pudding-register-input">
                  <LockKeyhole aria-hidden="true" />
                  <input
                    id="register-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t('register.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    {...focusHandlers('confirmPassword')}
                  />
                </div>
              </div>
            </div>

            {registrationConfigStatus === 'loading' && (
              <div className="pudding-register-notice">{t('register.configLoading')}</div>
            )}
            {registrationConfigStatus === 'error' && (
              <div className="pudding-register-notice is-error">{t('register.configUnavailable')}</div>
            )}

            <div className={`pudding-login-error ${error ? 'is-visible' : ''}`} role="alert">
              {error || '\u00a0'}
            </div>

            <button
              className="pudding-login-submit pudding-login-submit--login"
              type="submit"
              disabled={loading || registrationConfigStatus === 'loading' || registrationConfigStatus === 'error'}
              onMouseEnter={() => setReaction('success')}
              onMouseLeave={() => setReaction('idle')}
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
