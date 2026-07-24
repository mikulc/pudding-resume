import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME } from '../../../types/resume';
import { createEmptyResumeData } from '../../../utils/resumeDraft';
import { createDocumentSnapshot, getSnapshotKey } from './history';

describe('resume history model', () => {
  it('creates an isolated snapshot', () => {
    const data = createEmptyResumeData();
    const snapshot = createDocumentSnapshot(data, DEFAULT_THEME);

    data.personalInfo.fullName = 'Changed later';

    expect(snapshot.data.personalInfo.fullName).toBe('');
  });

  it('creates a stable key for equivalent snapshots', () => {
    const data = createEmptyResumeData();
    const first = createDocumentSnapshot(data, DEFAULT_THEME);
    const second = createDocumentSnapshot(data, DEFAULT_THEME);

    expect(getSnapshotKey(first)).toBe(getSnapshotKey(second));
  });
});
