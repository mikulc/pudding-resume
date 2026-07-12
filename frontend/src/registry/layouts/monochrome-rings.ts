import type { LayoutDefinition } from './types';

/**
 * Monochrome bar: centered profile header, right portrait, and high-contrast
 * gray section bars with a flush black accent rule.
 */
export const monochromeRingsLayout: LayoutDefinition = {
  id: 'monochrome-rings',
  nameKey: 'templateNames.monochromeRings',
  css: `
    .resume-paper[data-layout="monochrome-rings"] {
      color: #111111 !important;
      background: #ffffff !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] {
      position: relative !important;
      min-height: 38mm !important;
      margin-bottom: 7mm !important;
      border-radius: 0 !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] > div {
      position: relative !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      min-height: 38mm !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] .flex-1 {
      grid-area: 1 / 1 !important;
      align-self: center !important;
      width: 100% !important;
      padding: 0 28mm !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] h1,
    .resume-paper[data-layout="monochrome-rings"] .monochrome-rings-name {
      margin: 0 0 4.5mm !important;
      color: #111111 !important;
      font-size: 1.65em !important;
      line-height: 1.15 !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] .flex-1 > div {
      justify-content: center !important;
      gap: 0 !important;
      margin-bottom: 1.5mm !important;
      color: #171717 !important;
      font-size: 0.98em !important;
      font-weight: 500 !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="monochrome-rings"] .monochrome-rings-contact-item + .monochrome-rings-contact-item::before {
      content: "|" !important;
      display: inline-block !important;
      margin: 0 2.2mm !important;
      color: #111111 !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] svg {
      display: none !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] .personal-photo,
    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] .personal-photo-placeholder {
      position: relative !important;
      grid-area: 1 / 1 !important;
      align-self: start !important;
      justify-self: end !important;
      margin-top: 2mm !important;
      border: 0 !important;
      box-shadow: none !important;
      background: var(--theme-bg) !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] > .flex-row-reverse .personal-photo,
    .resume-paper[data-layout="monochrome-rings"] [data-page-section="personal"] > .flex-row-reverse .personal-photo-placeholder {
      justify-self: start !important;
    }

    .resume-paper[data-layout="monochrome-rings"] .section-header {
      display: flex !important;
      align-items: center !important;
      gap: 0 !important;
      margin: 0 0 4mm !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: color-mix(in srgb, var(--theme-border) 9%, #ffffff) !important;
      color: var(--theme-border) !important;
      font-size: var(--section-title-size) !important;
      line-height: 1.18 !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="monochrome-rings"] .section-header-bar {
      width: 1.1mm !important;
      height: auto !important;
      align-self: stretch !important;
      border-radius: 0 !important;
      background: var(--theme-border) !important;
      flex: 0 0 auto !important;
    }

    .resume-paper[data-layout="monochrome-rings"] .section-header > span:last-child {
      display: inline-flex !important;
      align-items: center !important;
      min-height: 7mm !important;
      padding: 1.3mm 4mm 1.3mm 5mm !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-page-section] {
      margin-bottom: 5mm !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="monochrome-rings"] [data-section] {
      margin-bottom: 3.6mm !important;
    }

    .resume-paper[data-layout="monochrome-rings"] .entry-title-row {
      margin-bottom: 1.2mm !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="monochrome-rings"] .entity-title {
      color: #111111 !important;
      font-weight: 900 !important;
    }

    .resume-paper[data-layout="monochrome-rings"] .text-gray-700 {
      color: #161616 !important;
    }

    .resume-paper[data-layout="monochrome-rings"] .text-gray-500,
    .resume-paper[data-layout="monochrome-rings"] .text-gray-400 {
      color: #202020 !important;
    }

    .resume-paper[data-layout="monochrome-rings"] ul.list-none {
      display: grid !important;
      gap: 1.35mm !important;
    }

    .resume-paper[data-layout="monochrome-rings"] ul.list-none > :not([hidden]) ~ :not([hidden]) {
      margin-top: 0 !important;
    }

    .resume-paper[data-layout="monochrome-rings"] ul.list-none li > span:first-child {
      color: var(--theme-border) !important;
      font-weight: 900 !important;
    }

    .resume-paper[data-layout="monochrome-rings"] .tag-badge {
      border: 1px solid var(--theme-border) !important;
      border-radius: 2px !important;
      background: transparent !important;
      color: var(--theme-tag-text) !important;
    }
  `,
  defaultColor: '#111111',
  headerMode: 'bar',
  signature: { layout: 'single-column', headerDecoration: 'none', sectionStyle: 'filled-title' },
  previewVersion: '1',
  personalInfoClass: 'monochrome-rings-contact-icon',
};
