import { describe, expect, it } from 'vitest';
import { blueBannerIconsLayout } from './blue-banner-icons';

describe('blueBannerIconsLayout', () => {
  it('uses the shared default page margin', () => {
    expect(blueBannerIconsLayout.defaultPageMargin).toBeUndefined();
  });

  it('aligns the photo with the top content margin', () => {
    const photoRule = blueBannerIconsLayout.css.match(
      /\.personal-photo,\s*[\s\S]*?\.personal-photo-placeholder\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(photoRule).toContain('margin-top: 0 !important');
  });

  it('leaves breathing room below the profile banner', () => {
    const personalSectionRule = blueBannerIconsLayout.css.match(
      /\[data-page-section="personal"\]\.blue-banner-icons-personal\s*\{([\s\S]*?)\}/,
    )?.[1];

    expect(personalSectionRule).toContain('margin-bottom: var(--resume-page-margin) !important');
    expect(blueBannerIconsLayout.css).toContain(
      '--blue-banner-profile-height: max(35mm, calc(var(--personal-photo-height) + 5mm))',
    );
    expect(blueBannerIconsLayout.css).toContain(
      'height: calc(var(--resume-page-margin) + var(--blue-banner-profile-height)) !important',
    );
  });
});
