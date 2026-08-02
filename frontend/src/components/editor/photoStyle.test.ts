import { describe, expect, it } from 'vitest';
import { DEFAULT_PERSONAL_PHOTO_STYLE } from '../../types/resume';
import { PHOTO_RADIUS_OPTIONS } from './photoStyle';

describe('photo style defaults', () => {
  it('uses the requested 3:4 default dimensions', () => {
    expect(DEFAULT_PERSONAL_PHOTO_STYLE).toMatchObject({ width: 100, height: 133 });
  });

  it('keeps the rounded preset aligned with the default radius', () => {
    expect(PHOTO_RADIUS_OPTIONS.find((option) => option.key === 'rounded')?.value)
      .toBe(DEFAULT_PERSONAL_PHOTO_STYLE.borderRadius);
  });

  it('provides a fully rounded circle preset', () => {
    expect(PHOTO_RADIUS_OPTIONS.find((option) => option.key === 'circle')?.value).toBe(999);
  });
});
