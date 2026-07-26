import { describe, expect, it } from 'vitest';
import { monochromeRingsLayout } from './monochrome-rings';

describe('monochromeRingsLayout', () => {
  it('uses the third preset color as its default', () => {
    expect(monochromeRingsLayout.defaultColor).toBe('#000000');
  });
});
