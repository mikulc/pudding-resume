import { describe, expect, it } from 'vitest';
import { blueBannerIconsLayout } from './blue-banner-icons';

describe('blueBannerIconsLayout', () => {
  it('uses the shared default page margin', () => {
    expect(blueBannerIconsLayout.defaultPageMargin).toBeUndefined();
  });

  it('vertically centers the photo in the full colored banner', () => {
    const photoRule = blueBannerIconsLayout.css.match(
      /\.personal-photo,\s*[\s\S]*?\.personal-photo-placeholder\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(photoRule).toContain('align-self: center !important');
  });

  it('uses the page margin as the banner content horizontal inset', () => {
    const personalSectionRule = blueBannerIconsLayout.css.match(
      /\[data-page-section="personal"\]\.blue-banner-icons-personal\s*\{([\s\S]*?)\}/,
    )?.[1];
    const personalContentRule = blueBannerIconsLayout.css.match(
      /\[data-page-section="personal"\] > div\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(personalSectionRule).toContain('margin-left: calc(-1 * var(--resume-page-margin)) !important');
    expect(personalSectionRule).toContain('width: calc(100% + 2 * var(--resume-page-margin)) !important');
    expect(personalContentRule).toContain('padding-right: var(--resume-page-margin) !important');
    expect(personalContentRule).toContain('padding-left: var(--resume-page-margin) !important');
  });

  it('does not clip profile content that extends into the top page margin', () => {
    expect(blueBannerIconsLayout.css).toMatch(
      /\[data-animated-section="personal"\]\[data-section-hidden="false"\] > \.overflow-hidden\s*\{[\s\S]*overflow:\s*visible !important/,
    );
  });

  it('shows the profile banner decoration only on the first page', () => {
    expect(blueBannerIconsLayout.css).toMatch(
      /\[data-page-index\]:not\(\[data-page-index="0"\]\)::before\s*\{[\s\S]*content:\s*none !important/,
    );
  });

  it('keeps the top-bleeding banner out of the measured content height', () => {
    expect(blueBannerIconsLayout.css).toMatch(
      /\[data-page-flow-root\]\s*\{[\s\S]*display:\s*flow-root !important/,
    );
  });

  it('exposes the first-page banner without reducing the usable page height', () => {
    const firstPageViewportRule = blueBannerIconsLayout.css.match(
      /\[data-page-index="0"\] \.resume-page-viewport\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(firstPageViewportRule).toContain(
      'height: calc(var(--resume-page-slice-height) + var(--resume-page-margin)) !important',
    );
    expect(firstPageViewportRule).toContain(
      'margin-top: calc(-1 * var(--resume-page-margin)) !important',
    );
    expect(firstPageViewportRule).toContain('padding-top: var(--resume-page-margin) !important');
  });

  it('uses compact spacing below the profile banner', () => {
    const personalSectionRule = blueBannerIconsLayout.css.match(
      /\[data-page-section="personal"\]\.blue-banner-icons-personal\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(personalSectionRule).toContain('margin-bottom: 8mm !important');
    expect(personalSectionRule).toContain(
      'min-height: calc(var(--resume-page-margin) + var(--blue-banner-profile-height)) !important',
    );
    expect(blueBannerIconsLayout.css).toContain(
      '--blue-banner-profile-height: max(35mm, calc(var(--personal-photo-height) + 5mm))',
    );
    expect(blueBannerIconsLayout.css).toContain(
      'height: calc(var(--resume-page-margin) + var(--blue-banner-profile-height)) !important',
    );
  });

  it('emphasizes the name in the profile banner', () => {
    const nameRule = blueBannerIconsLayout.css.match(
      /\.blue-banner-icons-name\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(nameRule).toContain('font-size: 1.75em !important');
  });

  it('keeps text-mode field labels readable on the dark banner', () => {
    const textModeLabelRule = blueBannerIconsLayout.css.match(
      /\.personal-info-mode-text \.text-gray-500\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(textModeLabelRule).toContain('color: #ffffff !important');
  });
});
