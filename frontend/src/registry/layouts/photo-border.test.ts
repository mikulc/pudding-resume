import { describe, expect, it } from 'vitest';
import { blueprintIconsLayout } from './blueprint-icons';
import { centerlineLayout } from './centerline';
import { classicHorizontalLayout } from './classic-horizontal';
import { leftSidebarTwoColumnLayout } from './left-sidebar-two-column';

describe('borderless portrait layouts', () => {
  it.each([
    ['left-sidebar-two-column', leftSidebarTwoColumnLayout],
    ['centerline', centerlineLayout],
    ['classic-horizontal', classicHorizontalLayout],
    ['blueprint-icons', blueprintIconsLayout],
  ])('%s removes the portrait and placeholder frame', (_layoutId, layout) => {
    const portraitRule = layout.css.match(
      /\.personal-photo,\s*[\s\S]*?\.personal-photo-placeholder\s*\{([\s\S]*?)\}/,
    );

    expect(portraitRule?.[1]).toContain('border: 0 !important');
    expect(portraitRule?.[1]).toContain('box-shadow: none !important');
  });
});
