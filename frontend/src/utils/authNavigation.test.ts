import { describe, expect, it } from 'vitest';
import { buildAuthPath, getAuthReturnPath } from './authNavigation';

describe('auth navigation', () => {
  it('builds a clean standalone locale auth URL', () => {
    expect(buildAuthPath('zh-CN', 'login')).toBe('/zh-CN/login');
    expect(buildAuthPath('en-US', 'register')).toBe('/en-US/register');
  });

  it('restores a safe internal route from browser history state', () => {
    expect(getAuthReturnPath({ returnTo: '/settings?tab=account' }, '/zh-CN')).toBe(
      '/settings?tab=account',
    );
  });

  it('uses the locale home fallback for external-looking return paths', () => {
    expect(getAuthReturnPath({ returnTo: 'https://example.com' }, '/zh-CN')).toBe('/zh-CN');
    expect(getAuthReturnPath({ returnTo: '//evil.example' }, '/zh-CN')).toBe('/zh-CN');
  });
});
