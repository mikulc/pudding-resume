import { describe, expect, it } from 'vitest';
import { resolvePhotoStyle } from './index';
import { tealRibbonWaveLayout } from './teal-ribbon-wave';

describe('tealRibbonWaveLayout', () => {
  it('uses the fourth preset color as its default', () => {
    expect(tealRibbonWaveLayout.defaultColor).toBe('#248f83');
  });

  it('resolves the theme default dynamically but preserves an explicit user shape', () => {
    expect(resolvePhotoStyle(tealRibbonWaveLayout.id, { width: 100, height: 133, borderRadius: 6 }))
      .toEqual({ width: 100, height: 100, borderRadius: 999 });
    expect(resolvePhotoStyle(tealRibbonWaveLayout.id, { width: 120, height: 160, borderRadius: 0 }, true))
      .toEqual({ width: 120, height: 160, borderRadius: 0 });
  });

  it('defaults to a circular portrait while letting the shared photo style control its shape', () => {
    expect(tealRibbonWaveLayout.css).toContain('height: 52mm !important');
    expect(tealRibbonWaveLayout.css).toContain('width: var(--personal-photo-width) !important');
    expect(tealRibbonWaveLayout.css).toContain('height: var(--personal-photo-height) !important');
    expect(tealRibbonWaveLayout.css).not.toContain('.personal-photo img {');
    expect(tealRibbonWaveLayout.defaultPhotoStyle).toEqual({ width: 100, height: 100, borderRadius: 999 });
    expect(tealRibbonWaveLayout.css).toContain('top: calc(5mm - var(--resume-page-margin)) !important');
    expect(tealRibbonWaveLayout.css).toContain('padding: calc(var(--personal-photo-width) + 12mm - var(--resume-page-margin)) 24mm 0 !important');
    expect(tealRibbonWaveLayout.css).toContain('data-animated-section="personal"');
  });

  it('extends the first-page clipping viewport into the top margin', () => {
    expect(tealRibbonWaveLayout.css).toMatch(
      /\[data-page-index="0"\]\s+\.resume-page-viewport\s*\{[\s\S]*margin-top:\s*calc\(-1 \* var\(--resume-page-margin\)\)[\s\S]*padding-top:\s*var\(--resume-page-margin\)/,
    );
    expect(tealRibbonWaveLayout.css).toContain(
      'height: calc(var(--resume-page-slice-height) + var(--resume-page-margin)) !important',
    );
  });
});
