import { describe, expect, it } from 'vitest';
import { calculateResumeListTotal } from './resumeListUtils';

describe('calculateResumeListTotal', () => {
  it('uses the complete local count for signed-out users', () => {
    expect(calculateResumeListTotal(8, [{}, { cloud_uuid: 'cloud-1' }], false)).toBe(2);
  });

  it('does not count a linked cloud/local resume twice', () => {
    expect(calculateResumeListTotal(
      10,
      [{ cloud_uuid: 'cloud-1' }, {}, {}],
      true,
    )).toBe(12);
  });

  it('keeps duplicate local links as additional standalone cards', () => {
    expect(calculateResumeListTotal(
      3,
      [{ cloud_uuid: 'cloud-1' }, { cloud_uuid: 'cloud-1' }],
      true,
    )).toBe(4);
  });
});
