import { describe, expect, it } from 'vitest';
import { createEmptyResumeData } from '../../../utils/resumeDraft';
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

  it('keeps custom section order and visibility consistent', () => {
    const initial = createEmptyResumeData();
    const added = resumeReducer(initial, {
      type: 'ADD_CUSTOM_SECTION',
      payload: { id: 'custom-1', name: 'Open source' },
    });
    const hidden = resumeReducer(added, {
      type: 'TOGGLE_SECTION_VISIBILITY',
      payload: 'custom-1',
    });
    const removed = resumeReducer(hidden, {
      type: 'DELETE_CUSTOM_SECTION',
      payload: 'custom-1',
    });

    expect(added.sectionOrder).toContain('custom-1');
    expect(hidden.hiddenSections).toContain('custom-1');
    expect(removed.customSections).toEqual([]);
    expect(removed.sectionOrder).not.toContain('custom-1');
  });
});
