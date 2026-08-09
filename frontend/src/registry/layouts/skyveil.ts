import type { LayoutDefinition } from './types';

/** Light blue bar layout: use the built-in section bar styling. */
export const skyveilLayout: LayoutDefinition = {
  id: 'skyveil',
  nameKey: 'templateNames.skyveil',
  css: `
    .resume-paper {
      background: #ffffff !important;
    }

    .resume-paper[data-layout="skyveil"] .skyveil-contact-icon {
      color: var(--theme-border) !important;
    }
  `,
  defaultColor: '#3B82F6',
  headerMode: 'bar',
  signature: { layout: 'single-column', headerDecoration: 'solid-bar', sectionStyle: 'filled-title' },
  previewVersion: '2',
  personalInfoClass: 'skyveil-contact-icon',
};
