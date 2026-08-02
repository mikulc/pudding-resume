import { describe, expect, it } from 'vitest';
import { tealRibbonWaveLayout } from './teal-ribbon-wave';

describe('tealRibbonWaveLayout', () => {
  it('uses the fourth preset color as its default', () => {
    expect(tealRibbonWaveLayout.defaultColor).toBe('#248f83');
  });

  it('renders a circular portrait and raises the header wave', () => {
    expect(tealRibbonWaveLayout.css).toContain('height: 52mm !important');
    expect(tealRibbonWaveLayout.css).toContain('width: var(--personal-photo-width) !important');
    expect(tealRibbonWaveLayout.css).toContain('border-radius: 50% !important');
    expect(tealRibbonWaveLayout.css).toContain('top: calc(5mm - var(--resume-page-margin)) !important');
    expect(tealRibbonWaveLayout.css).toContain('padding: calc(var(--personal-photo-width) + 12mm - var(--resume-page-margin)) 24mm 0 !important');
    expect(tealRibbonWaveLayout.css).toContain('data-animated-section="personal"');
  });
});
