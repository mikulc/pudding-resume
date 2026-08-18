import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, isResumeEntryId, type ThemeSettings } from '../types/resume';
import { createEmptyResumeData } from '../utils/resumeDraft';
import { createExportThemeSettings, createOrderedResumeContent } from './useExportJSON';

describe('createExportThemeSettings', () => {
  it('exports one theme color and removes legacy color objects', () => {
    const legacyTheme = {
      ...DEFAULT_THEME,
      themeColor: undefined,
      fontFamily: 'system',
      colorTheme: 'custom',
      customColors: {
        bg: '#DBEAFE',
        border: '#A855F7',
        tagBg: '#EFF6FF',
        tagText: '#2563EB',
      },
    } as unknown as ThemeSettings;

    const exported = createExportThemeSettings(legacyTheme) as unknown as Record<string, unknown> & {
      appearance: { layoutId: string; themeColor: string };
      typography: ThemeSettings['typography'];
    };

    expect(exported.appearance.themeColor).toBe('#A855F7');
    expect(exported.customColors).toBeUndefined();
    expect(exported.colorTheme).toBeUndefined();
    expect(exported.typography.fontFamily).toBe('noto-sans-sc');
    expect(exported.fontFamily).toBeUndefined();
    expect(JSON.stringify(exported)).not.toContain('customColors');
    expect(JSON.stringify(exported)).not.toContain('"fontFamily":"system"');
  });

  it('exports only enabled when the watermark is disabled', () => {
    const exported = createExportThemeSettings({
      ...DEFAULT_THEME,
      watermark: {
        ...DEFAULT_THEME.watermark,
        enabled: false,
        content: 'Should not be exported',
      },
    });

    expect(exported.watermark).toEqual({ enabled: false });
  });

  it('exports all watermark settings when the watermark is enabled', () => {
    const watermark = {
      ...DEFAULT_THEME.watermark,
      enabled: true,
      content: 'Custom watermark',
    };
    const exported = createExportThemeSettings({ ...DEFAULT_THEME, watermark });

    expect(exported.watermark).toEqual(watermark);
  });

  it('exports personal header settings under settings', () => {
    const exported = createExportThemeSettings({
      ...DEFAULT_THEME,
      personalHeader: {
        ...DEFAULT_THEME.personalHeader,
        fieldDisplayMode: 'text',
        photoLayout: 'right',
        photoLayoutCustomized: true,
      },
    });

    expect(exported.personalInfoLayout).toEqual({
      ...DEFAULT_THEME.personalHeader,
      fieldDisplayMode: 'text',
      photoLayout: 'right',
      photoLayoutCustomized: true,
    });
  });

  it('exports only the current entry title layout field', () => {
    const legacyTheme = {
      ...DEFAULT_THEME,
      entryTitleLayout: 'stacked',
      titleLayout: 'three-column',
    } as unknown as ThemeSettings;
    const exported = createExportThemeSettings(legacyTheme) as unknown as Record<string, unknown> & {
      pageLayout: { entryTitleLayout: string };
    };

    expect(exported.pageLayout.entryTitleLayout).toBe('stacked');
    expect(exported.titleLayout).toBeUndefined();
    expect(JSON.stringify(exported)).not.toContain('titleLayout');
  });

  it('exports typography without legacy flat fields', () => {
    const exported = createExportThemeSettings({
      ...DEFAULT_THEME,
      typography: {
        fontFamily: 'misans',
        bodyFontSize: 18,
        sectionTitleFontSize: 20,
        entryTitleFontSize: 16,
        lineSpacing: 1.6,
      },
    }) as unknown as Record<string, unknown> & { typography: ThemeSettings['typography'] };

    expect(exported.typography).toEqual({
      fontFamily: 'misans',
      bodyFontSize: 18,
      sectionTitleFontSize: 20,
      entryTitleFontSize: 16,
      lineSpacing: 1.6,
    });
    expect(exported.fontSize).toBeUndefined();
    expect(exported.lineSpacing).toBeUndefined();
    expect(exported.sectionTitleFontSize).toBeUndefined();
    expect(exported.entryTitleFontSize).toBeUndefined();
  });

  it('groups exported document settings by responsibility', () => {
    const exported = createExportThemeSettings(DEFAULT_THEME);

    expect(Object.keys(exported)).toEqual([
      'appearance',
      'typography',
      'pageLayout',
      'personalInfoLayout',
      'watermark',
    ]);
    expect(exported.appearance).toEqual({
      layoutId: DEFAULT_THEME.layoutId,
      themeColor: DEFAULT_THEME.themeColor,
    });
    expect(exported.pageLayout).toEqual({
      pageMargin: DEFAULT_THEME.pageMargin,
      entryTitleLayout: DEFAULT_THEME.entryTitleLayout,
    });
  });
});

describe('createOrderedResumeContent', () => {
  it('never exports legacy presentation fields from personalInfo', () => {
    const data = createEmptyResumeData();
    const legacyData = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        displayMode: 'text',
        photoLayout: 'right',
        photoLayoutCustomized: true,
        photoStyle: { width: 90, height: 120, borderRadius: 8 },
        photoStyleCustomized: true,
      },
    } as typeof data;

    const content = createOrderedResumeContent(legacyData);
    const personalInfo = content.personalInfo as Record<string, unknown>;

    expect(personalInfo.displayMode).toBeUndefined();
    expect(personalInfo.photoLayout).toBeUndefined();
    expect(personalInfo.photoLayoutCustomized).toBeUndefined();
    expect(personalInfo.photoStyle).toBeUndefined();
    expect(personalInfo.photoStyleCustomized).toBeUndefined();
  });

  it('exports only canonical personal information fields', () => {
    const data = createEmptyResumeData();
    const legacyData = {
      ...data,
      personalInfo: {
        fullName: '布丁',
        phone: '13888888888',
        email: 'pudding@example.com',
        photoUrl: '',
        jobStatus: '随时到岗',
        jobTarget: '前端工程师',
        location: '深圳',
        customFields: { GitHub: '@pudding' },
        fieldOrder: ['fullName', 'GitHub'],
      },
    } as unknown as typeof data;

    const personalInfo = createOrderedResumeContent(legacyData).personalInfo;
    expect(personalInfo).toMatchObject({
      fullName: '布丁',
      jobSearchStatus: '随时到岗',
      targetRole: '前端工程师',
      preferredLocation: '深圳',
      customFields: [
        { id: 'custom-legacy-1', label: 'GitHub', value: '@pudding' },
      ],
    });
    expect(JSON.stringify(personalInfo)).not.toContain('jobStatus');
    expect(JSON.stringify(personalInfo)).not.toContain('jobTarget');
    expect(JSON.stringify(personalInfo)).not.toContain('fieldOrder');
  });

  it('does not export retired certification or portfolio modules', () => {
    const data = {
      ...createEmptyResumeData(),
      certifications: [{ id: 'cert-1', name: 'Example', date: '2024-01' }],
      portfolio: [{ id: 'work-1', name: 'Example', link: '', description: '' }],
      sectionOrder: ['personal', 'certifications', 'portfolio', 'summary'],
      sectionTitles: { certifications: '证书', portfolio: '作品' },
      hiddenSections: ['certifications', 'portfolio'],
      sectionConfig: undefined,
    } as unknown as ReturnType<typeof createEmptyResumeData>;

    const content = createOrderedResumeContent(data);

    expect(content).not.toHaveProperty('certifications');
    expect(content).not.toHaveProperty('portfolio');
    expect(content.sectionConfig).toEqual({
      order: ['personal', 'summary'],
      titleOverrides: {},
      hidden: [],
    });
  });

  it('exports UUID v4 IDs for every repeatable resume entry', () => {
    const data = {
      ...createEmptyResumeData(),
      education: [{
        id: 'education-1',
        school: '',
        major: '',
        degree: '',
        startDate: '',
        endDate: '',
        details: '',
      }],
      workExperience: [{
        id: 'work-1',
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
      }],
      projects: [{
        id: 'project-1',
        name: '',
        role: '',
        startDate: '',
        endDate: '',
        link: '',
        description: '',
      }],
      honors: [{ id: 'honor-1', name: '', date: '' }],
    };

    const content = createOrderedResumeContent(data);
    const ids = [
      ...(content.education as typeof data.education),
      ...(content.workExperience as typeof data.workExperience),
      ...(content.projects as typeof data.projects),
      ...(content.honors as typeof data.honors),
    ].map((entry) => entry.id);

    expect(ids.every(isResumeEntryId)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exports required canonical fields and omits legacy section fields', () => {
    const content = createOrderedResumeContent(createEmptyResumeData());

    expect(content).toHaveProperty('summary', '');
    expect(content).toHaveProperty('honors');
    expect(content).toHaveProperty('customSections');
    expect(content).toHaveProperty('sectionConfig');
    expect(content).not.toHaveProperty('sectionOrder');
    expect(content).not.toHaveProperty('sectionTitles');
    expect(content).not.toHaveProperty('hiddenSections');
  });
});
