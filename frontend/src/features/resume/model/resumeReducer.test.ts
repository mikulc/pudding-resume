import { describe, expect, it } from 'vitest';
import { createEmptyResumeData } from '../../../utils/resumeDraft';
import { createCustomSectionId } from '../../../types/resume';
import { resumeReducer } from './resumeReducer';

describe('resumeReducer', () => {
  it('adds, updates and removes education entries without mutating prior state', () => {
    const initial = createEmptyResumeData();
    const education = {
      id: 'education-1',
      school: 'Example University',
      major: 'Computer Science',
      degree: 'Bachelor',
      startDate: '2020-09',
      endDate: '2024-06',
      courses: '',
    };

    const added = resumeReducer(initial, { type: 'ADD_EDUCATION', payload: education });
    const updated = resumeReducer(added, {
      type: 'UPDATE_EDUCATION',
      payload: { ...education, degree: 'BSc' },
    });
    const removed = resumeReducer(updated, {
      type: 'DELETE_EDUCATION',
      payload: education.id,
    });

    expect(initial.education).toHaveLength(0);
    expect(added.education).toEqual([education]);
    expect(updated.education[0].degree).toBe('BSc');
    expect(removed.education).toEqual([]);
  });

  it('normalizes legacy array-based rich text while loading data', () => {
    const initial = createEmptyResumeData();
    const loaded = resumeReducer(initial, {
      type: 'LOAD_DATA',
      payload: {
        ...initial,
        skills: ['TypeScript', 'Go'] as unknown as string,
        workExperience: [
          {
            id: 'work-1',
            company: 'Example',
            position: 'Engineer',
            location: 'Remote',
            startDate: '2024-01',
            endDate: '',
            highlights: ['Built features', 'Improved quality'] as unknown as string,
          },
        ],
      },
    });

    expect(loaded.skills).toBe('1. TypeScript\n2. Go');
    expect(loaded.workExperience[0].highlights).toBe(
      '1. Built features\n2. Improved quality',
    );
  });

  it('removes legacy presentation settings from personal content while loading', () => {
    const initial = createEmptyResumeData();
    const legacyPersonalInfo = {
      ...initial.personalInfo,
      displayMode: 'text',
      photoLayout: 'right',
      photoLayoutCustomized: true,
      photoStyle: { width: 90, height: 120, borderRadius: 8 },
      photoStyleCustomized: true,
    };
    const loaded = resumeReducer(initial, {
      type: 'LOAD_DATA',
      payload: {
        ...initial,
        personalInfo: legacyPersonalInfo,
      } as typeof initial,
    });

    const personalInfo = loaded.personalInfo as typeof loaded.personalInfo & Record<string, unknown>;
    expect(personalInfo.displayMode).toBeUndefined();
    expect(personalInfo.photoLayout).toBeUndefined();
    expect(personalInfo.photoLayoutCustomized).toBeUndefined();
    expect(personalInfo.photoStyle).toBeUndefined();
    expect(personalInfo.photoStyleCustomized).toBeUndefined();
  });

  it('keeps custom section order and visibility consistent', () => {
    const initial = createEmptyResumeData();
    const customSectionId = createCustomSectionId();
    const added = resumeReducer(initial, {
      type: 'ADD_CUSTOM_SECTION',
      payload: { id: customSectionId, name: 'Open source' },
    });
    const hidden = resumeReducer(added, {
      type: 'TOGGLE_SECTION_VISIBILITY',
      payload: customSectionId,
    });
    const removed = resumeReducer(hidden, {
      type: 'DELETE_CUSTOM_SECTION',
      payload: customSectionId,
    });

    expect(added.sectionConfig.order).toContain(customSectionId);
    expect(hidden.sectionConfig.hidden).toContain(customSectionId);
    expect(removed.customSections).toEqual([]);
    expect(removed.sectionConfig.order).not.toContain(customSectionId);
  });
});
