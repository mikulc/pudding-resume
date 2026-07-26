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
});
