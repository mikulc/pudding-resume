import { describe, expect, it } from 'vitest';
import { tealRibbonWaveLayout } from './teal-ribbon-wave';

describe('tealRibbonWaveLayout', () => {
  it('uses the fourth preset color as its default', () => {
    expect(tealRibbonWaveLayout.defaultColor).toBe('#248f83');
  });
});
