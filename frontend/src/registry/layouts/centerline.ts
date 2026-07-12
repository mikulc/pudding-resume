import type { LayoutDefinition } from './types';

/**
 * Centerline: white single-column resume with centered profile header,
 * black section dividers, and dense ATS-friendly content.
 */
export const centerlineLayout: LayoutDefinition = {
  id: 'centerline',
  nameKey: 'templateNames.centerline',
  css: `
    .resume-paper[data-layout="centerline"] {
      color: #222222 !important;
      background: #ffffff !important;
    }

    .resume-paper[data-layout="centerline"] .centerline-personal {
      margin-bottom: 4mm !important;
      padding-bottom: 4mm !important;
      border-bottom: 2px solid var(--theme-border) !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="centerline"] .centerline-personal > div {
      position: relative !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      min-height: 30mm !important;
    }

    .resume-paper[data-layout="centerline"] .centerline-personal-info {
      grid-area: 1 / 1 !important;
      width: 100% !important;
      padding: 0 28mm !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="centerline"] .centerline-name {
      margin-bottom: 2mm !important;
      color: var(--theme-border) !important;
      font-size: 1.75em !important;
      line-height: 1.2 !important;
      font-weight: 700 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="centerline"] .centerline-personal-info > div {
      justify-content: center !important;
      gap: 1.5mm 3mm !important;
      margin-bottom: 1.5mm !important;
      color: #4b5563 !important;
      font-size: 0.88em !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="centerline"] .centerline-contact-icon {
      color: var(--theme-border) !important;
    }

    .resume-paper[data-layout="centerline"] .centerline-personal .personal-photo,
    .resume-paper[data-layout="centerline"] .centerline-personal .personal-photo-placeholder {
      position: relative !important;
      grid-area: 1 / 1 !important;
      align-self: start !important;
      justify-self: end !important;
      border: 1px solid #d1d5db !important;
      box-shadow: none !important;
    }

    .resume-paper[data-layout="centerline"] .centerline-personal > .flex-row-reverse .personal-photo,
    .resume-paper[data-layout="centerline"] .centerline-personal > .flex-row-reverse .personal-photo-placeholder {
      justify-self: start !important;
    }

    .resume-paper[data-layout="centerline"] .section-header {
      margin: 0 0 2.8mm 0 !important;
      padding: 0 0 1.4mm 0 !important;
      background: transparent !important;
      border-bottom: 1px solid var(--theme-border) !important;
      color: var(--theme-border) !important;
      font-size: var(--section-title-size) !important;
      line-height: 1.25 !important;
      font-weight: 800 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="centerline"] .section-header-bar {
      display: none !important;
    }

    .resume-paper[data-layout="centerline"] [data-page-section] {
      margin-bottom: 4mm !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="centerline"] [data-section] {
      margin-bottom: 3mm !important;
    }

    .resume-paper[data-layout="centerline"] .entry-title-row {
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="centerline"] .entity-title {
      color: var(--theme-border) !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="centerline"] .text-gray-700 {
      color: #333333 !important;
    }

    .resume-paper[data-layout="centerline"] .text-gray-500,
    .resume-paper[data-layout="centerline"] .text-gray-400 {
      color: #666666 !important;
    }

    .resume-paper[data-layout="centerline"] ul.list-none {
      display: grid !important;
      gap: 1mm !important;
    }

    .resume-paper[data-layout="centerline"] ul.list-none li > span:first-child {
      color: var(--theme-border) !important;
      font-weight: 700 !important;
    }

    .resume-paper[data-layout="centerline"] .tag-badge {
      border: 1px solid var(--theme-border) !important;
      border-radius: 2px !important;
      background: transparent !important;
      color: var(--theme-border) !important;
    }
  `,
  defaultColor: '#000000',
  headerMode: 'underline',
  signature: { layout: 'single-column', headerDecoration: 'none', sectionStyle: 'underline' },
  previewVersion: '1',
  personalInfoClass: 'centerline-contact-icon',
};
