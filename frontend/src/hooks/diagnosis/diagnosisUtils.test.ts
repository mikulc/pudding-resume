import { describe, expect, it, vi } from 'vitest';
import { normalizePersonalInfo, type ResumeAction, type ResumeData } from '../../types/resume';
import { createEmptyResumeData } from '../../utils/resumeDraft';
import { collectResumeText, normalizeDiagnosisLanguage } from './collectResumeText';
import { hashContent } from './cache';
import { replaceInResume } from './replaceInResume';

const resume = {
  ...createEmptyResumeData(),
  personalInfo: normalizePersonalInfo({
    fullName: 'Test User',
    phone: '',
    email: '',
    photoUrl: '',
  }),
  summary: 'Focused frontend engineer',
  skills: 'TypeScript',
} satisfies ResumeData;

describe('diagnosis utilities', () => {
  it('normalizes language and collects analyzable resume text', () => {
    expect(normalizeDiagnosisLanguage('zh-Hans')).toBe('zh-CN');
    expect(normalizeDiagnosisLanguage('en-GB')).toBe('en-US');

    const content = collectResumeText(resume, 'en-US');
    expect(content).toContain('Focused frontend engineer');
    expect(content).toContain('TypeScript');
  });

  it('produces stable content hashes that change with content', () => {
    expect(hashContent('same content')).toBe(hashContent('same content'));
    expect(hashContent('same content')).not.toBe(hashContent('changed content'));
  });

  it('dispatches the matching resume update when replacing text', () => {
    const dispatch = vi.fn<(action: ResumeAction) => void>();

    expect(replaceInResume(resume, 'skills', 'TypeScript', 'React', dispatch)).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SKILLS', payload: 'React' });
  });
});
