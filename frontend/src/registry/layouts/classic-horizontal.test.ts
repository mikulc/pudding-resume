import { describe, expect, it } from 'vitest';
import { classicHorizontalLayout } from './classic-horizontal';

describe('classicHorizontalLayout', () => {
  it('does not hide field icons for every display mode', () => {
    expect(classicHorizontalLayout.css).not.toContain(
      '[data-page-section="personal"] svg {\n      display: none !important;',
    );
  });

  it('adds breathing room around none-mode separators', () => {
    expect(classicHorizontalLayout.css).toMatch(
      /\.personal-info-mode-none[\s\S]*\.personal-contact-separator\s*\{[\s\S]*margin:\s*0 1\.5mm !important/,
    );
  });
});
