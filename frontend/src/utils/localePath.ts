import type { SupportedLanguage } from './localSettings';

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export const DEFAULT_LOCALE: SupportedLanguage = 'zh-CN';

const PUBLIC_LOCALE_PATHS = new Set(['', '/', '/login', '/register']);

export function isSupportedLocale(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as SupportedLanguage);
}

export function getLocaleFromPath(pathname: string): SupportedLanguage | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return isSupportedLocale(firstSegment) ? firstSegment : null;
}

export function stripLocalePrefix(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (!locale) return pathname || '/';

  const stripped = pathname.slice(`/${locale}`.length);
  return stripped || '/';
}

export function withLocalePrefix(pathname: string, locale: SupportedLanguage): string {
  const cleanPath = stripLocalePrefix(pathname);
  return cleanPath === '/' ? `/${locale}` : `/${locale}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

export function replaceLocaleInPath(pathname: string, locale: SupportedLanguage): string {
  return withLocalePrefix(pathname, locale);
}

export function replaceLocaleInUrl(
  pathname: string,
  search: string,
  hash: string,
  locale: SupportedLanguage,
): string {
  return `${replaceLocaleInPath(pathname, locale)}${search}${hash}`;
}

export function isPublicLocalePath(pathname: string): boolean {
  if (!getLocaleFromPath(pathname)) return pathname === '/';
  return PUBLIC_LOCALE_PATHS.has(stripLocalePrefix(pathname));
}

export function getDefaultLocalePath(locale: SupportedLanguage): string {
  return `/${locale}`;
}
