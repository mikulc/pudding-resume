import { describe, expect, it } from 'vitest';
import { DEFAULT_FONT_FAMILY } from './defaults';
import { getFontOption, getFontStack, normalizeFontFamilyId } from './fonts';

describe('default resume font', () => {
  it('uses an explicit Noto Sans SC ID instead of system', () => {
    expect(DEFAULT_FONT_FAMILY).toBe('noto-sans-sc');
    expect(getFontOption(DEFAULT_FONT_FAMILY)?.id).toBe('noto-sans-sc');
  });

  it('migrates the legacy system ID to Noto Sans SC', () => {
    expect(normalizeFontFamilyId('system')).toBe('noto-sans-sc');
    expect(getFontStack('system')).toContain('Noto Sans SC');
  });
});
