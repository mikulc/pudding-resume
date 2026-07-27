import { describe, expect, it } from 'vitest';
import { azureSidebarLayout } from './azure-sidebar';
import { leftSidebarTwoColumnLayout } from './left-sidebar-two-column';

describe('azureSidebarLayout', () => {
  it('uses the first preset color as its default', () => {
    expect(azureSidebarLayout.defaultColor).toBe('#3B82F6');
  });
});

describe('leftSidebarTwoColumnLayout', () => {
  it('matches the azure sidebar left inset', () => {
    expect(leftSidebarTwoColumnLayout.css).toContain(
      'padding: var(--resume-page-margin) 0 var(--resume-page-margin) 6.5mm !important;',
    );
  });
});

describe.each([
  ['azure sidebar', azureSidebarLayout],
  ['left sidebar two column', leftSidebarTwoColumnLayout],
])('%s contact details', (_name, layout) => {
  it('wraps long personal information instead of clipping it', () => {
    expect(layout.css).toContain('white-space: normal !important;');
    expect(layout.css).toContain('overflow-wrap: anywhere !important;');
    expect(layout.css).toContain('word-break: break-word !important;');
    expect(layout.css).not.toContain('white-space: nowrap !important;');
  });
});
