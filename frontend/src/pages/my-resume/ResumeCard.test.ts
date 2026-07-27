import { describe, expect, it } from 'vitest';
import { formatResumeTime } from './ResumeCard';

describe('formatResumeTime', () => {
  it('always includes the full date and time', () => {
    expect(formatResumeTime('2026-07-27T09:43:00+08:00')).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    );
  });

  it('does not emit corrupted date placeholders', () => {
    expect(formatResumeTime('2026-07-26T18:12:00+08:00')).not.toContain('?');
  });

  it('uses a stable placeholder for an invalid timestamp', () => {
    expect(formatResumeTime('')).toBe('--');
  });
});
