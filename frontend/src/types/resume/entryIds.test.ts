import { describe, expect, it } from 'vitest';
import { createEmptyResumeData } from '../../utils/resumeDraft';
import {
  isCustomSectionId,
  isResumeEntryId,
  normalizeResumeDate,
  normalizeResumeEntryIds,
} from './entryIds';

describe('resume entry IDs', () => {
  it('preserves valid UUID v4 IDs and migrates legacy IDs', () => {
    const validId = '550e8400-e29b-41d4-a716-446655440000';
    const data = createEmptyResumeData();
    const normalized = normalizeResumeEntryIds({
      ...data,
      education: [{
        id: validId,
        school: '',
        major: '',
        degree: '',
        startDate: '',
        endDate: '',
        courses: '',
      }],
      workExperience: [{
        id: 'work-1',
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        highlights: '',
      }],
      projects: [{
        id: '',
        name: '',
        role: '',
        startDate: '',
        endDate: '',
        link: '',
        highlights: '',
      }],
    });

    expect(normalized.education[0].id).toBe(validId);
    expect(isResumeEntryId(normalized.workExperience[0].id)).toBe(true);
    expect(isResumeEntryId(normalized.projects[0].id)).toBe(true);
  });

  it('replaces duplicate UUIDs across entry collections', () => {
    const duplicateId = '550e8400-e29b-41d4-a716-446655440000';
    const data = createEmptyResumeData();
    const normalized = normalizeResumeEntryIds({
      ...data,
      education: [{
        id: duplicateId,
        school: '',
        major: '',
        degree: '',
        startDate: '',
        endDate: '',
        courses: '',
      }],
      honors: [{ id: duplicateId, name: '', date: '' }],
    });

    expect(normalized.education[0].id).toBe(duplicateId);
    expect(normalized.honors?.[0].id).not.toBe(duplicateId);
    expect(isResumeEntryId(normalized.honors?.[0].id)).toBe(true);
  });

  it('normalizes recognized resume dates to YYYY-MM', () => {
    expect(normalizeResumeDate('2024.6')).toBe('2024-06');
    expect(normalizeResumeDate('2024/06')).toBe('2024-06');
    expect(normalizeResumeDate('202406')).toBe('2024-06');
    expect(normalizeResumeDate('至今')).toBe('present');
    expect(normalizeResumeDate('2024-13')).toBe('2024-13');
  });

  it('migrates custom section IDs and every sectionConfig reference together', () => {
    const data = createEmptyResumeData();
    const normalized = normalizeResumeEntryIds({
      ...data,
      customSections: [{ id: 'custom-1700000000', name: '开源经历', content: '内容' }],
      sectionConfig: {
        order: ['personal', 'custom-1700000000'],
        titleOverrides: { 'custom-1700000000': '开源项目' },
        hidden: ['custom-1700000000'],
      },
    });

    const migratedId = normalized.customSections[0].id;
    expect(isCustomSectionId(migratedId)).toBe(true);
    expect(normalized.sectionConfig.order).toEqual(['personal', migratedId]);
    expect(normalized.sectionConfig.hidden).toEqual([migratedId]);
    expect(normalized.sectionConfig.titleOverrides).toEqual({ [migratedId]: '开源项目' });
  });
});
