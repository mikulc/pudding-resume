import { describe, expect, it } from 'vitest';
import { azureSidebarLayout } from './azure-sidebar';
import { leftSidebarTwoColumnLayout } from './left-sidebar-two-column';
import { resolvePhotoLayout } from './index';

describe('azureSidebarLayout', () => {
  it('uses the first preset color as its default', () => {
    expect(azureSidebarLayout.defaultColor).toBe('#3B82F6');
  });

  it('defaults the portrait and sidebar to the left', () => {
    expect(azureSidebarLayout.defaultPhotoLayout).toBe('left');
    expect(resolvePhotoLayout(azureSidebarLayout.id)).toBe('left');
  });
});

describe('leftSidebarTwoColumnLayout', () => {
  it('matches the azure sidebar left inset', () => {
    expect(leftSidebarTwoColumnLayout.css).toContain(
      'padding: 20mm 0 var(--resume-page-margin) 6.5mm !important;',
    );
  });

  it('keeps its nested surfaces transparent so the page watermark remains visible', () => {
    expect(leftSidebarTwoColumnLayout.css).toMatch(
      /\.left-sidebar-two-column-shell[\s\S]*?background: transparent !important;/,
    );
    expect(leftSidebarTwoColumnLayout.css).toMatch(
      /\.left-sidebar-two-column-sidebar[\s\S]*?background: transparent !important;/,
    );
    expect(leftSidebarTwoColumnLayout.css).toMatch(
      /\.left-sidebar-two-column-main[\s\S]*?background: transparent !important;/,
    );
  });

  it('defaults the portrait and sidebar to the left', () => {
    expect(leftSidebarTwoColumnLayout.defaultPhotoLayout).toBe('left');
    expect(resolvePhotoLayout(leftSidebarTwoColumnLayout.id)).toBe('left');
  });

  it('keeps an explicit user choice instead of the theme default', () => {
    expect(resolvePhotoLayout(leftSidebarTwoColumnLayout.id, 'right', true)).toBe('right');
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

  it('supports moving the sidebar to the right with the portrait layout setting', () => {
    expect(layout.css).toContain('.sidebar-position-right');
    expect(layout.css).toContain('grid-template-columns: minmax(0, 1fr) 52mm !important;');
    expect(layout.css).toContain('grid-column: 2 !important;');
    expect(layout.css).toContain('padding-left: 5mm !important;');
    expect(layout.css).toContain('padding-right: 0 !important;');
  });
});
