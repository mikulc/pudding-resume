import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { lockModalScroll } from '../../utils/modalScrollLock';
import './login-experience.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

type FocusedField = 'email' | 'password' | null;
type Reaction = 'idle' | 'success' | 'error';

interface LookPoint {
  x: number;
  y: number;
}

let hasAuthArtworkEntered = false;

function Character({
  kind,
  look,
  focusedField,
  reaction,
}: {
  kind: 'orange' | 'blue' | 'black' | 'yellow';
  look: LookPoint;
  focusedField: FocusedField;
  reaction: Reaction;
}) {
  const isPassword = focusedField === 'password';
  const isEmail = focusedField === 'email';
  const eyeTransform = useMemo(() => {
    const x = Math.max(-4, Math.min(4, (look.x - 0.5) * 8));
    const y = Math.max(-3, Math.min(3, (look.y - 0.48) * 6));
    return `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }, [look]);

  return (
    <div
      className={[
        'pudding-login-character',
        `pudding-login-character--${kind}`,
        isEmail ? 'is-curious' : '',
        isPassword ? 'is-shy' : '',
        reaction === 'success' ? 'is-happy' : '',
        reaction === 'error' ? 'is-shaking' : '',
      ].join(' ')}
      aria-hidden="true"
    >
      <div className="pudding-login-face">
        <span className="pudding-login-eye">
          <i style={{ transform: eyeTransform }} />
        </span>
        <span className="pudding-login-eye">
          <i style={{ transform: eyeTransform }} />
        </span>
        <span className="pudding-login-mouth" />
      </div>
    </div>
  );
}

export function AuthArtwork({
  focusedField,
  reaction,
}: {
  focusedField: FocusedField;
  reaction: Reaction;
}) {
  const { t } = useTranslation('auth');
  const skipEntryAnimation = hasAuthArtworkEntered;
  const [look, setLook] = useState<LookPoint>({ x: 0.5, y: 0.45 });

  useEffect(() => {
    hasAuthArtworkEntered = true;
    const handlePointerMove = (event: PointerEvent) => {
      setLook({
        x: event.clientX / Math.max(window.innerWidth, 1),
        y: event.clientY / Math.max(window.innerHeight, 1),
      });
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <section className={`pudding-login-artwork ${skipEntryAnimation ? 'is-entry-settled' : ''}`}>
      <div className="pudding-login-glow pudding-login-glow--one" />
      <div className="pudding-login-glow pudding-login-glow--two" />
      <span className="pudding-login-bubble pudding-login-bubble--one" />
      <span className="pudding-login-bubble pudding-login-bubble--two" />
      <span className="pudding-login-bubble pudding-login-bubble--three" />

      <div className="pudding-login-copy">
        <span className="pudding-login-kicker">{t('experience.kicker')}</span>
        <h2>{t('experience.title')}</h2>
        <p>{t('experience.description')}</p>
      </div>

      <div className="pudding-login-crew">
        <Character kind="orange" look={look} focusedField={focusedField} reaction={reaction} />
        <Character kind="blue" look={look} focusedField={focusedField} reaction={reaction} />
        <Character kind="black" look={look} focusedField={focusedField} reaction={reaction} />
        <Character kind="yellow" look={look} focusedField={focusedField} reaction={reaction} />
      </div>
      <div className="pudding-login-floor" />
    </section>
  );
}

export function LoginModal({ open, onClose, onSwitchToRegister }: Props) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [reaction, setReaction] = useState<Reaction>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
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

  const showValidationError = useCallback((message: string) => {
    setError(message);
    setReaction('error');
    window.setTimeout(() => setReaction('idle'), 560);
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      showValidationError(t('login.emailRequired'));
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      showValidationError(t('login.invalidEmail'));
      return;
    }
    if (!password) {
      showValidationError(t('login.passwordRequired'));
      return;
    }

    setLoading(true);
    try {
      await login({ email: trimmedEmail, password });
      setFocusedField(null);
      setReaction('success');
      showToast(t('login.loginSuccess'), 'success');
      window.setTimeout(() => {
        reset();
        onClose();
      }, 420);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t('login.loginFailed');
      showValidationError(message);
      showToast(message, 'error');
      setLoading(false);
    }
  }, [email, login, onClose, password, reset, showToast, showValidationError, t]);

  if (!open) return null;

  return createPortal(
    <div className="pudding-login-shell" role="dialog" aria-modal="true" aria-labelledby="pudding-login-title">
      <button className="pudding-login-close" type="button" onClick={handleClose} aria-label={t('common:button.close')}>
        <X />
      </button>

      <AuthArtwork focusedField={focusedField} reaction={reaction} />

      <section className="pudding-login-panel pudding-login-panel--centered-mobile">
        <div className="pudding-login-form-wrap">
          <header className="pudding-login-header pudding-login-header--centered">
            <h1 id="pudding-login-title">{t('login.welcomeTitle')}</h1>
            <p>{t('login.welcomeDescription')}</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <label className="pudding-login-label" htmlFor="login-email">{t('login.email')}</label>
            <div className="pudding-login-input">
              <Mail aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
              />
            </div>

            <label className="pudding-login-label" htmlFor="login-password">{t('login.password')}</label>
            <div className="pudding-login-input">
              <LockKeyhole aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
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

            <div className={`pudding-login-error ${error ? 'is-visible' : ''}`} role="alert">
              {error || '\u00a0'}
            </div>

            <button
              className="pudding-login-submit pudding-login-submit--login"
              type="submit"
              disabled={loading}
              onMouseEnter={() => setReaction('success')}
              onMouseLeave={() => setReaction('idle')}
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
