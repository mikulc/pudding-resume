import { describe, expect, it } from 'vitest';
import {
  normalizeHiddenSections,
  normalizePersonalInfo,
  normalizeSectionConfig,
  normalizeSectionOrder,
  normalizeSectionTitles,
} from './core';

describe('normalizePersonalInfo', () => {
  it('returns a complete canonical personal info model for missing input', () => {
    expect(normalizePersonalInfo()).toEqual({
      fullName: '',
      phone: '',
      email: '',
      photoUrl: '',
      jobSearchStatus: '',
      targetRole: '',
      preferredLocation: '',
      customFields: [],
      fieldConfig: {
        order: [
          'fullName',
          'phone',
          'email',
          'jobSearchStatus',
          'targetRole',
          'preferredLocation',
        ],
        hidden: [],
        labelOverrides: {},
        iconOverrides: {},
      },
    });
  });

  it('migrates legacy field names and custom-field references to stable IDs', () => {
    const normalized = normalizePersonalInfo({
      fullName: '布丁',
      jobStatus: '随时到岗',
      jobTarget: '前端工程师',
      location: '深圳',
      customFields: { GitHub: '@pudding' },
      fieldOrder: ['fullName', 'GitHub', 'jobTarget', 'phone'],
      hiddenFields: ['GitHub', 'photo'],
      fieldLabels: { jobTarget: '求职岗位' },
      iconMap: { GitHub: 'github', jobStatus: 'clock' },
    });

    expect(normalized).toMatchObject({
      jobSearchStatus: '随时到岗',
      targetRole: '前端工程师',
      preferredLocation: '深圳',
      customFields: [
        { id: 'custom-legacy-1', label: 'GitHub', value: '@pudding' },
      ],
      fieldConfig: {
        hidden: ['custom-legacy-1', 'photo'],
        labelOverrides: { targetRole: '求职岗位' },
        iconOverrides: {
          'custom-legacy-1': 'github',
          jobSearchStatus: 'clock',
        },
      },
    });
    expect(normalized.fieldConfig.order.slice(0, 4)).toEqual([
      'fullName',
      'custom-legacy-1',
      'targetRole',
      'phone',
    ]);
  });

  it('keeps canonical custom field IDs when labels change', () => {
    const normalized = normalizePersonalInfo({
      customFields: [
        { id: 'custom-github', label: '代码主页', value: '@pudding' },
      ],
      fieldConfig: {
        order: ['custom-github'],
        hidden: ['custom-github'],
        iconOverrides: { 'custom-github': 'github' },
      },
    });

    expect(normalized.customFields[0]).toEqual({
      id: 'custom-github',
      label: '代码主页',
      value: '@pudding',
    });
    expect(normalized.fieldConfig.hidden).toEqual(['custom-github']);
    expect(normalized.fieldConfig.iconOverrides).toEqual({
      'custom-github': 'github',
    });
  });

  it('preserves imported custom fields that are missing or reuse reserved IDs', () => {
    const normalized = normalizePersonalInfo({
      customFields: [
        { label: '主页', value: 'example.com' },
        { id: 'phone', label: '备用电话', value: '123' },
      ],
    });

    expect(normalized.customFields).toEqual([
      { id: 'custom-imported-1', label: '主页', value: 'example.com' },
      { id: 'custom-imported-2', label: '备用电话', value: '123' },
    ]);
  });
});

describe('removed built-in sections', () => {
  it('filters legacy section references while keeping supported and custom modules', () => {
    expect(normalizeSectionOrder([
      'personal',
      'certifications',
      'custom-1',
      'portfolio',
      'summary',
    ])).toEqual(['personal', 'custom-1', 'summary']);
    expect(normalizeHiddenSections(['portfolio', 'honors'])).toEqual(['honors']);
    expect(normalizeSectionTitles({
      certifications: '证书',
      portfolio: '作品',
      honors: '荣誉',
    })).toEqual({ honors: '荣誉' });
  });

  it('migrates legacy section fields while preferring the canonical sectionConfig', () => {
    expect(normalizeSectionConfig(undefined, {
      sectionOrder: ['personal', 'portfolio', 'summary'],
      sectionTitles: { summary: '关于我', certifications: '证书' },
      hiddenSections: ['education', 'portfolio'],
    })).toEqual({
      order: ['personal', 'summary'],
      titleOverrides: { summary: '关于我' },
      hidden: ['education'],
    });

    expect(normalizeSectionConfig({
      order: ['skills'],
      titleOverrides: { skills: '能力' },
      hidden: ['summary'],
    }, {
      sectionOrder: ['personal'],
      sectionTitles: { skills: '旧标题' },
      hiddenSections: ['education'],
    })).toEqual({
      order: ['skills'],
      titleOverrides: { skills: '能力' },
      hidden: ['summary'],
    });
  });
});
