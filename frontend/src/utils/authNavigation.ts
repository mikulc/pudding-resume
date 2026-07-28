import type { SupportedLanguage } from './localSettings';

export type AuthMode = 'login' | 'register';

export function buildAuthPath(
  locale: SupportedLanguage,
  mode: AuthMode,
): string {
  return `/${locale}/${mode}`;
}

export interface AuthRouteState {
  returnTo?: unknown;
}

export function getAuthReturnPath(state: AuthRouteState | null, fallback: string): string {
  const returnTo = state?.returnTo;

  if (
    typeof returnTo !== 'string'
    || !returnTo
    || !returnTo.startsWith('/')
    || returnTo.startsWith('//')
    || returnTo.includes('\\')
  ) {
    return fallback;
  }

  return returnTo;
}
