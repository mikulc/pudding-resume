import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
type LoginField = Exclude<FocusedField, null>;

interface LookPoint {
  x: number;
  y: number;
}

function Character({
  kind,
  look,
  focusedField,
  reaction,
  reactionsEnabled,
}: {
  kind: 'orange' | 'blue' | 'black' | 'yellow';
  look: LookPoint;
  focusedField: FocusedField;
  reaction: Reaction;
  reactionsEnabled: boolean;
}) {
  const isPassword = reactionsEnabled && focusedField === 'password';
  const isEmail = reactionsEnabled && focusedField === 'email';
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
        isPassword ? 'is-looking-around' : '',
        reaction === 'success' ? 'is-happy' : '',
      ].join(' ')}
      data-character-kind={kind}
      aria-hidden="true"
    >
      <div className={`pudding-login-character-body ${reaction === 'error' ? 'is-shaking' : ''}`}>
        <div className="pudding-login-face">
          <span className="pudding-login-eye">
            <i className="pudding-login-pupil pudding-login-pupil--tracking" style={{ transform: eyeTransform }} />
            <i className="pudding-login-pupil pudding-login-pupil--wandering" />
          </span>
          <span className="pudding-login-eye">
            <i className="pudding-login-pupil pudding-login-pupil--tracking" style={{ transform: eyeTransform }} />
            <i className="pudding-login-pupil pudding-login-pupil--wandering" />
          </span>
          <span className="pudding-login-mouth" />
        </div>
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
  const [look, setLook] = useState<LookPoint>({ x: 0.5, y: 0.45 });
  const [entryReady, setEntryReady] = useState(false);
  const enteredCharacters = useRef(new Set<string>());

  useEffect(() => {
    const entryFallback = window.setTimeout(() => setEntryReady(true), 1400);
    const handlePointerMove = (event: PointerEvent) => {
      setLook({
        x: event.clientX / Math.max(window.innerWidth, 1),
        y: event.clientY / Math.max(window.innerHeight, 1),
      });
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.clearTimeout(entryFallback);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  const handleCharacterAnimationEnd = (event: React.AnimationEvent<HTMLElement>) => {
    if (event.animationName !== 'pudding-character-in') return;

    const kind = (event.target as HTMLElement).dataset.characterKind;
    if (!kind) return;

    enteredCharacters.current.add(kind);
    if (enteredCharacters.current.size === 4) {
      setEntryReady(true);
    }
  };

  return (
    <section className="pudding-login-artwork" onAnimationEnd={handleCharacterAnimationEnd}>
      <div className="pudding-login-glow pudding-login-glow--one" />
      <div className="pudding-login-glow pudding-login-glow--two" />
      <span className="pudding-login-bubble pudding-login-bubble--one" />
      <span className="pudding-login-bubble pudding-login-bubble--two" />
      <span className="pudding-login-bubble pudding-login-bubble--three" />

      <div className="pudding-login-stage">
        <div className="pudding-login-copy">
          <span className="pudding-login-kicker">{t('experience.kicker')}</span>
          <h2>{t('experience.title')}</h2>
          <p>{t('experience.description')}</p>
        </div>

        <div className="pudding-login-scene">
          <div className="pudding-login-crew">
            <Character kind="orange" look={look} focusedField={focusedField} reaction={reaction} reactionsEnabled={entryReady} />
            <Character kind="blue" look={look} focusedField={focusedField} reaction={reaction} reactionsEnabled={entryReady} />
            <Character kind="black" look={look} focusedField={focusedField} reaction={reaction} reactionsEnabled={entryReady} />
            <Character kind="yellow" look={look} focusedField={focusedField} reaction={reaction} reactionsEnabled={entryReady} />
          </div>
          <div className="pudding-login-floor" />
        </div>
      </div>
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setFocusedField(null);
    setReaction('idle');
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

  const triggerErrorReaction = useCallback(() => {
    setReaction('error');
    window.setTimeout(() => setReaction('idle'), 560);
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setGlobalError('');
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setFieldErrors({ email: t('login.emailRequired') });
      triggerErrorReaction();
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      setFieldErrors({ email: t('login.invalidEmail') });
      triggerErrorReaction();
      return;
    }
    if (!password) {
      setFieldErrors({ password: t('login.passwordRequired') });
      triggerErrorReaction();
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
      setGlobalError(message);
      triggerErrorReaction();
      showToast(message, 'error');
      setLoading(false);
    }
  }, [email, login, onClose, password, reset, showToast, t, triggerErrorReaction]);

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
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
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
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
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
