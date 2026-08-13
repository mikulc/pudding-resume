import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { lockModalScroll } from '../../utils/modalScrollLock';
import logo from '../../assets/logo.svg';
import { AuthThemeToggle } from './AuthThemeToggle';
import './login-experience.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

type LoginField = 'email' | 'password';

export function LoginModal({ open, onClose, onSwitchToRegister }: Props) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
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

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setGlobalError('');
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setFieldErrors({ email: t('login.emailRequired') });
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      setFieldErrors({ email: t('login.invalidEmail') });
      return;
    }
    if (!password) {
      setFieldErrors({ password: t('login.passwordRequired') });
      return;
    }

    setLoading(true);
    try {
      await login({ email: trimmedEmail, password });
      showToast(t('login.loginSuccess'), 'success');
      window.setTimeout(() => {
        reset();
        onClose();
      }, 420);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t('login.loginFailed');
      setGlobalError(message);
      showToast(message, 'error');
      setLoading(false);
    }
  }, [email, login, onClose, password, reset, showToast, t]);

  if (!open) return null;

  return createPortal(
    <div className="pudding-login-shell" role="dialog" aria-modal="true" aria-label={t('login.title')}>
      <section className="pudding-login-panel pudding-login-panel--centered-mobile">
        <div className="pudding-login-form-wrap">
          <AuthThemeToggle />
          <header className="pudding-login-header pudding-login-header--centered">
            <img className="pudding-login-logo" src={logo} alt="Pudding Resume" />
            <p>{t('login.welcomeDescription')}</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="pudding-login-field">
              <label className="pudding-login-label" htmlFor="login-email">{t('login.email')}</label>
              <div className={`pudding-login-input ${fieldErrors.email ? 'is-error' : ''}`}>
                <Mail aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }}
                  placeholder={t('login.emailPlaceholder')}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby="login-email-error"
                />
              </div>
              <div id="login-email-error" className="pudding-field-error">
                {fieldErrors.email || '\u00a0'}
              </div>
            </div>

            <div className="pudding-login-field">
              <label className="pudding-login-label" htmlFor="login-password">{t('login.password')}</label>
              <div className={`pudding-login-input ${fieldErrors.password ? 'is-error' : ''}`}>
                <LockKeyhole aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby="login-password-error"
                />
                <button
                  className="pudding-login-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              <div id="login-password-error" className="pudding-field-error">
                {fieldErrors.password || '\u00a0'}
              </div>
            </div>

            <div className={`pudding-login-error ${globalError ? 'is-visible' : ''}`} role="alert">
              {globalError || '\u00a0'}
            </div>

            <button
              className="pudding-login-submit pudding-login-submit--login"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? t('login.loading') : t('login.submit')}</span>
              {loading && <Loader2 className="pudding-login-spinner" />}
            </button>
          </form>

          <p className="pudding-login-register">
            {t('login.noAccount')}{' '}
            <button type="button" onClick={() => { reset(); onSwitchToRegister(); }}>
              {t('login.register')}
            </button>
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}
