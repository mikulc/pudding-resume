import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME,
  deriveThemeColors,
  normalizeThemeSettings,
  resolveThemeColor,
} from './theme';

describe('theme color compatibility', () => {
  it('prefers the single current themeColor field', () => {
    expect(resolveThemeColor({
      themeColor: '#0EA5E9',
      customColors: { border: '#EF4444' },
    })).toBe('#0EA5E9');
  });

  it('reads the main color from legacy customColors data', () => {
    expect(resolveThemeColor({
      colorTheme: 'custom',
      customColors: { border: '#8B5CF6' },
    })).toBe('#8B5CF6');
  });

  it('derives preview colors without persisting extra color values', () => {
    expect(deriveThemeColors('#3B82F6')).toEqual({
      border: '#3B82F6',
      bg: '#e2ecfe',
    });
  });
});

describe('personal header settings compatibility', () => {
  it('migrates presentation fields from legacy personalInfo', () => {
    const normalized = normalizeThemeSettings(undefined, {
      displayMode: 'text',
      photoLayout: 'right',
      photoLayoutCustomized: true,
      photoStyle: { width: 88, height: 112, borderRadius: 12 },
      photoStyleCustomized: true,
    });

    expect(normalized.personalHeader).toEqual({
      fieldDisplayMode: 'text',
      photoLayout: 'right',
      photoLayoutCustomized: true,
      photoStyle: { width: 88, height: 112, borderRadius: 12 },
      photoStyleCustomized: true,
    });
  });

  it('prefers current settings over legacy content and fills missing defaults', () => {
    const normalized = normalizeThemeSettings({
      personalHeader: { fieldDisplayMode: 'none' },
    }, {
      displayMode: 'text',
      photoLayout: 'left',
      photoLayoutCustomized: true,
    });

    expect(normalized.personalHeader).toEqual({
      ...DEFAULT_THEME.personalHeader,
      fieldDisplayMode: 'none',
      photoLayout: 'left',
      photoLayoutCustomized: true,
    });
  });

  it('rejects invalid enum values', () => {
    const normalized = normalizeThemeSettings({
      personalHeader: {
        fieldDisplayMode: 'badge',
        photoLayout: 'center',
      },
    });

    expect(normalized.personalHeader.fieldDisplayMode).toBe('icon');
    expect(normalized.personalHeader.photoLayout).toBeUndefined();
  });
});

describe('entry title layout compatibility', () => {
  it('migrates the legacy titleLayout field', () => {
    const normalized = normalizeThemeSettings({ titleLayout: 'three-column' });

    expect(normalized.entryTitleLayout).toBe('three-column');
    expect((normalized as unknown as Record<string, unknown>).titleLayout).toBeUndefined();
  });

  it('prefers the current entryTitleLayout field', () => {
    const normalized = normalizeThemeSettings({
      entryTitleLayout: 'stacked',
      titleLayout: 'three-column',
    });

    expect(normalized.entryTitleLayout).toBe('stacked');
  });
});

describe('typography compatibility', () => {
  it('migrates legacy flat typography fields', () => {
    const normalized = normalizeThemeSettings({
      fontFamily: 'system',
      fontSize: 18,
      sectionTitleFontSize: 20,
      entryTitleFontSize: 16,
      lineSpacing: 1.8,
    });

    expect(normalized.typography).toEqual({
      fontFamily: 'noto-sans-sc',
      bodyFontSize: 18,
      sectionTitleFontSize: 20,
      entryTitleFontSize: 16,
      lineSpacing: 1.8,
    });
  });

  it('prefers current typography fields over legacy flat fields', () => {
    const normalized = normalizeThemeSettings({
      typography: { bodyFontSize: 20, lineSpacing: 1.6 },
      fontSize: 14,
      lineSpacing: 1.2,
    });

    expect(normalized.typography.bodyFontSize).toBe(20);
    expect(normalized.typography.lineSpacing).toBe(1.6);
    expect(normalized.typography.fontFamily).toBe(DEFAULT_THEME.typography.fontFamily);
  });
});

describe('grouped document settings compatibility', () => {
  it('reads the grouped JSON format', () => {
    const normalized = normalizeThemeSettings({
      appearance: { layoutId: 'classic-horizontal', themeColor: '#A855F7' },
      pageLayout: { pageMargin: 20, entryTitleLayout: 'stacked' },
      personalInfoLayout: { fieldDisplayMode: 'text', photoLayout: 'left' },
    });

    expect(normalized.layoutId).toBe('classic-horizontal');
    expect(normalized.themeColor).toBe('#A855F7');
    expect(normalized.pageMargin).toBe(20);
    expect(normalized.entryTitleLayout).toBe('stacked');
    expect(normalized.personalHeader.fieldDisplayMode).toBe('text');
    expect(normalized.personalHeader.photoLayout).toBe('left');
  });

  it('prefers grouped fields over the previous flat format', () => {
    const normalized = normalizeThemeSettings({
      appearance: { layoutId: 'skyveil', themeColor: '#0EA5E9' },
      layoutId: 'classic-horizontal',
      themeColor: '#EF4444',
      pageLayout: { pageMargin: 12, entryTitleLayout: 'compact' },
      pageMargin: 20,
      entryTitleLayout: 'stacked',
      personalInfoLayout: { fieldDisplayMode: 'none' },
      personalHeader: { fieldDisplayMode: 'text' },
    });

    expect(normalized.layoutId).toBe('skyveil');
    expect(normalized.themeColor).toBe('#0EA5E9');
    expect(normalized.pageMargin).toBe(12);
    expect(normalized.entryTitleLayout).toBe('compact');
    expect(normalized.personalHeader.fieldDisplayMode).toBe('none');
  });
});
