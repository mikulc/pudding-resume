import { describe, expect, it } from 'vitest';
import { blueBannerIconsLayout } from './blue-banner-icons';
import { blueprintIconsLayout } from './blueprint-icons';
import { classicHorizontalLayout } from './classic-horizontal';
import { monochromeRingsLayout } from './monochrome-rings';
import { tealRibbonWaveLayout } from './teal-ribbon-wave';

const layouts = [
  classicHorizontalLayout,
  blueprintIconsLayout,
  monochromeRingsLayout,
  tealRibbonWaveLayout,
  blueBannerIconsLayout,
];

describe.each(layouts)('$id field display modes', (layout) => {
  it('keeps personal information icons available in icon mode', () => {
    expect(layout.css).not.toMatch(
      /\[data-page-section="personal"\]\s+svg\s*\{\s*display:\s*none\s*!important/,
    );
  });

  it('adds spacing around none-mode separators', () => {
    expect(layout.css).toMatch(
      /\.personal-info-mode-none[\s\S]*\.personal-contact-separator\s*\{[\s\S]*margin:\s*0 1\.5mm !important/,
    );
  });
});
