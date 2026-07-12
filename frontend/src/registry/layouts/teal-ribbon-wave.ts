import type { LayoutDefinition } from './types';

/**
 * Teal ribbon wave: blue curved header with centered round portrait and
 * clipped teal ribbon section labels.
 */
export const tealRibbonWaveLayout: LayoutDefinition = {
  id: 'teal-ribbon-wave',
  nameKey: 'templateNames.tealRibbonWave',
  css: `
    .resume-paper[data-layout="teal-ribbon-wave"] {
      color: #111827 !important;
      background: #ffffff !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"]::before {
      content: "" !important;
      position: absolute !important;
      top: -28mm !important;
      left: -18mm !important;
      width: calc(100% + 36mm) !important;
      height: 55mm !important;
      pointer-events: none !important;
      border-radius: 0 0 50% 50% / 0 0 28% 28% !important;
      background: var(--theme-border) !important;
      z-index: 0 !important;
    }

    /* Paginated previews render each sheet as its own paper. The wave is a
       first-page header decoration, so suppress the duplicated shape on
       continuation pages. */
    .resume-paper[data-layout="teal-ribbon-wave"][data-page-index]:not([data-page-index="0"])::before {
      content: none !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] [data-page-section="personal"] {
      position: relative !important;
      min-height: 48mm !important;
      margin-bottom: 2mm !important;
      border-radius: 0 !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] [data-page-section="personal"] > div {
      position: relative !important;
      display: block !important;
      min-height: 48mm !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] [data-page-section="personal"] .flex-1 {
      width: 100% !important;
      padding: calc(var(--personal-photo-height) + 4mm) 24mm 0 !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] [data-page-section="personal"] h1,
    .resume-paper[data-layout="teal-ribbon-wave"] .teal-ribbon-wave-name {
      margin: 0 0 2mm !important;
      color: #111111 !important;
      font-size: 1.55em !important;
      line-height: 1.15 !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] [data-page-section="personal"] .flex-1 > div {
      justify-content: center !important;
      gap: 0 !important;
      margin-bottom: 0.8mm !important;
      color: #111111 !important;
      font-size: 0.9em !important;
      font-weight: 500 !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .teal-ribbon-wave-contact-item + .teal-ribbon-wave-contact-item::before {
      content: "|" !important;
      display: inline-block !important;
      margin: 0 2mm !important;
      color: #111111 !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] [data-page-section="personal"] svg {
      display: none !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] [data-page-section="personal"] .personal-photo,
    .resume-paper[data-layout="teal-ribbon-wave"] [data-page-section="personal"] .personal-photo-placeholder {
      position: absolute !important;
      top: 0mm !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      border: 0 !important;
      box-shadow: 0 1mm 2mm rgba(15, 23, 42, 0.08) !important;
      background: #f8fafc !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .section-header {
      display: flex !important;
      align-items: center !important;
      gap: 0 !important;
      margin: 0 0 3.2mm !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      color: #ffffff !important;
      font-size: var(--section-title-size) !important;
      line-height: 1.18 !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .section-header::after {
      content: "" !important;
      display: block !important;
      height: 1px !important;
      flex: 1 1 auto !important;
      background: color-mix(in srgb, var(--theme-border) 18%, #ffffff) !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .section-header-bar {
      display: none !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .section-header > span:last-child {
      position: relative !important;
      display: inline-flex !important;
      align-items: center !important;
      min-width: 28mm !important;
      height: 7.3mm !important;
      padding: 0 8mm 0 4.5mm !important;
      clip-path: polygon(0 0, calc(100% - 3.2mm) 0, 100% 100%, 0 100%) !important;
      background: var(--theme-border) !important;
      color: #ffffff !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .section-header > span:last-child::after {
      content: "" !important;
      position: absolute !important;
      top: 0 !important;
      right: -4.2mm !important;
      width: 7mm !important;
      height: 100% !important;
      transform: skewX(12deg) !important;
      background: color-mix(in srgb, var(--theme-border) 14%, transparent) !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] [data-page-section] {
      margin-bottom: 4.5mm !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] [data-section] {
      margin-bottom: 3.3mm !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .entry-title-row {
      margin-bottom: 1mm !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .entity-title {
      color: #111111 !important;
      font-weight: 900 !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .text-gray-700 {
      color: #111827 !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .text-gray-500,
    .resume-paper[data-layout="teal-ribbon-wave"] .text-gray-400 {
      color: #111827 !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] ul.list-none {
      display: grid !important;
      gap: 0.95mm !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] ul.list-none > :not([hidden]) ~ :not([hidden]) {
      margin-top: 0 !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] ul.list-none li > span:first-child {
      color: #111111 !important;
      font-weight: 900 !important;
    }

    .resume-paper[data-layout="teal-ribbon-wave"] .tag-badge {
      border: 1px solid var(--theme-border) !important;
      border-radius: 2px !important;
      background: transparent !important;
      color: var(--theme-tag-text) !important;
    }
  `,
  defaultColor: '#168b8c',
  headerMode: 'bar',
  signature: { layout: 'single-column', headerDecoration: 'wave', sectionStyle: 'filled-title' },
  previewVersion: '1',
  personalInfoClass: 'teal-ribbon-wave-contact-icon',
};
