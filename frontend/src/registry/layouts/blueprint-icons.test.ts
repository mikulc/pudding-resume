import { describe, expect, it } from 'vitest';
import { blueprintIconsLayout } from './blueprint-icons';

describe('blueprintIconsLayout', () => {
  it('uses the first preset blue as its default color', () => {
    expect(blueprintIconsLayout.defaultColor).toBe('#3B82F6');
  });

  it('does not render ring decorations on the resume or theme signature', () => {
    expect(blueprintIconsLayout.css).not.toContain('.resume-paper[data-layout="blueprint-icons"]::before');
    expect(blueprintIconsLayout.css).not.toContain('.resume-paper[data-layout="blueprint-icons"]::after');
    expect(blueprintIconsLayout.signature.headerDecoration).toBe('none');
  });

  it('keeps the following section below the portrait with spacing', () => {
    expect(blueprintIconsLayout.css).toMatch(
      /\[data-page-section="personal"\]\s*\{[\s\S]*?min-height:\s*max\(30mm, var\(--personal-photo-height\)\) !important;[\s\S]*?margin-bottom:\s*11mm !important;/,
    );
    expect(blueprintIconsLayout.css).toMatch(
      /\[data-page-section="personal"\] > div\s*\{[\s\S]*?min-height:\s*max\(30mm, var\(--personal-photo-height\)\) !important;/,
    );
  });

  it('vertically aligns personal details with the portrait', () => {
    expect(blueprintIconsLayout.css).toMatch(
      /\[data-page-section="personal"\] > div\s*\{[\s\S]*?display:\s*flex !important;[\s\S]*?align-items:\s*center !important;/,
    );
  });
});
