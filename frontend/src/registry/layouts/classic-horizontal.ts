import type { LayoutDefinition } from './types';

/**
 * Classic horizontal: monochrome single-column resume with centered profile
 * header, bold section names, and full-width horizontal rules.
 */
export const classicHorizontalLayout: LayoutDefinition = {
  id: 'classic-horizontal',
  nameKey: 'templateNames.classicHorizontal',
  css: `
    .resume-paper[data-layout="classic-horizontal"] {
      color: #303030 !important;
      background: #ffffff !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] {
      margin-bottom: 4.5mm !important;
      border-radius: 0 !important;
      color: #2f2f2f !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] > div {
      position: relative !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      min-height: 30mm !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] h1 {
      margin: 0 0 1.5mm !important;
      color: #2a2a2a !important;
      font-size: 1.7em !important;
      line-height: 1.25 !important;
      font-weight: 800 !important;
      letter-spacing: 0 !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] .flex-1 {
      grid-area: 1 / 1 !important;
      align-self: center !important;
      width: 100% !important;
      padding: 0 24mm !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] .flex-1 > div {
      justify-content: center !important;
      margin-bottom: 1.2mm !important;
      color: #333333 !important;
      font-size: 0.88em !important;
      font-weight: 700 !important;
      gap: 1mm 0 !important;
    }

    .resume-paper[data-layout="classic-horizontal"] .classic-horizontal-contact-item + .classic-horizontal-contact-item::before {
      content: "|" !important;
      display: inline-block !important;
      margin: 0 2mm !important;
      color: #333333 !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] svg {
      display: none !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] .personal-photo,
    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] .personal-photo-placeholder {
      position: relative !important;
      grid-area: 1 / 1 !important;
      align-self: start !important;
      justify-self: end !important;
      border: 1px solid #d1d5db !important;
      box-shadow: none !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] > .flex-row-reverse .personal-photo,
    .resume-paper[data-layout="classic-horizontal"] [data-page-section="personal"] > .flex-row-reverse .personal-photo-placeholder {
      justify-self: start !important;
    }

    .resume-paper[data-layout="classic-horizontal"] .section-header {
      margin: 0 0 2.5mm 0 !important;
      padding: 0 0 0.8mm 0 !important;
      background: transparent !important;
      border-bottom: 1.5px solid var(--theme-border) !important;
      color: var(--theme-border) !important;
      font-size: var(--section-title-size) !important;
      line-height: 1.25 !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="classic-horizontal"] .section-header-bar {
      display: none !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-page-section] {
      margin-bottom: 4mm !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="classic-horizontal"] [data-section] {
      margin-bottom: 3.2mm !important;
    }

    .resume-paper[data-layout="classic-horizontal"] .entry-title-row {
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="classic-horizontal"] .entity-title {
      color: #333333 !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="classic-horizontal"] .text-gray-700 {
      color: #3c3c3c !important;
    }

    .resume-paper[data-layout="classic-horizontal"] .text-gray-500,
    .resume-paper[data-layout="classic-horizontal"] .text-gray-400 {
      color: #555555 !important;
    }

    .resume-paper[data-layout="classic-horizontal"] ul.list-none {
      display: grid !important;
      gap: 1.3mm !important;
    }

    .resume-paper[data-layout="classic-horizontal"] ul.list-none li > span:first-child {
      color: #333333 !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="classic-horizontal"] .tag-badge {
      border: 1px solid var(--theme-border) !important;
      border-radius: 2px !important;
      background: transparent !important;
      color: var(--theme-tag-text) !important;
    }
  `,
  defaultColor: '#000000',
  headerMode: 'underline',
  signature: { layout: 'single-column', headerDecoration: 'none', sectionStyle: 'minimal' },
  previewVersion: '1',
  personalInfoClass: 'text-[#333333]',
};
