import { describe, expect, it } from 'vitest';
import { getSettingsSectionFromHash } from './settingsNavigation';

describe('getSettingsSectionFromHash', () => {
  it('returns the requested settings card for a valid hash', () => {
    expect(getSettingsSectionFromHash('#storage')).toBe('storage');
  });

  it('ignores empty and unknown hashes', () => {
    expect(getSettingsSectionFromHash('')).toBeNull();
    expect(getSettingsSectionFromHash('#unknown')).toBeNull();
  });
});
