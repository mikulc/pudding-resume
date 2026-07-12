import type { LayoutDefinition } from './types';
import { ICONS } from './cyanblu-icons';

/**
 * Blue banner icons: solid blue profile banner with white text and compact
 * black round icon section headers.
 */
export const blueBannerIconsLayout: LayoutDefinition = {
  id: 'blue-banner-icons',
  nameKey: 'templateNames.blueBannerIcons',
  css: `
    .resume-paper[data-layout="blue-banner-icons"] {
      color: #050505 !important;
      background: #ffffff !important;
    }

    .resume-paper[data-layout="blue-banner-icons"]::before {
      content: "" !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: max(50mm, calc(var(--resume-page-margin) + 5mm + var(--personal-photo-height))) !important;
      pointer-events: none !important;
      background: var(--theme-border) !important;
      z-index: 0 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"].blue-banner-icons-personal {
      position: relative !important;
      min-height: 35mm !important;
      margin-bottom: 9mm !important;
      border-radius: 0 !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] > div {
      position: relative !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      min-height: 35mm !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] .flex-1 {
      grid-area: 1 / 1 !important;
      align-self: center !important;
      width: 100% !important;
      padding: 0 31mm 0 !important;
      text-align: center !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] h1,
    .resume-paper[data-layout="blue-banner-icons"] .blue-banner-icons-name {
      margin: 0 0 3mm !important;
      color: #ffffff !important;
      font-size: 1.5em !important;
      line-height: 1.15 !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] .flex-1 > div {
      justify-content: center !important;
      gap: 0 !important;
      margin-bottom: 1mm !important;
      color: #ffffff !important;
      font-size: 0.9em !important;
      font-weight: 500 !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .blue-banner-icons-contact-item + .blue-banner-icons-contact-item::before {
      content: "|" !important;
      display: inline-block !important;
      margin: 0 2mm !important;
      color: #ffffff !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] svg {
      display: none !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] .personal-photo,
    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] .personal-photo-placeholder {
      position: relative !important;
      grid-area: 1 / 1 !important;
      align-self: start !important;
      justify-self: end !important;
      margin-top: 3mm !important;
      border: 0 !important;
      box-shadow: none !important;
      background: #f8fafc !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] .personal-photo img {
      object-position: top center !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] > .flex-row-reverse .personal-photo,
    .resume-paper[data-layout="blue-banner-icons"] [data-page-section="personal"] > .flex-row-reverse .personal-photo-placeholder {
      justify-self: start !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .section-header {
      display: flex !important;
      align-items: center !important;
      gap: 2mm !important;
      margin: 0 0 2.5mm !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      color: #050505 !important;
      font-size: var(--section-title-size) !important;
      line-height: 1.2 !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .section-header::after {
      content: "" !important;
      display: block !important;
      height: 1px !important;
      flex: 1 1 auto !important;
      background: color-mix(in srgb, var(--theme-border) 18%, #ffffff) !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .section-header-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 5.2mm !important;
      height: 5.2mm !important;
      border-radius: 50% !important;
      background: var(--theme-border) !important;
      flex: 0 0 auto !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .section-header-icon svg {
      display: block !important;
      width: 3mm !important;
      height: 3mm !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-page-section] {
      margin-bottom: 4.2mm !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] [data-section] {
      margin-bottom: 3.2mm !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .entry-title-row {
      margin-bottom: 1mm !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .entity-title {
      color: #050505 !important;
      font-weight: 900 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .text-gray-700 {
      color: #050505 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .text-gray-500,
    .resume-paper[data-layout="blue-banner-icons"] .text-gray-400 {
      color: #050505 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] ul.list-none {
      display: grid !important;
      gap: 1mm !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] ul.list-none > :not([hidden]) ~ :not([hidden]) {
      margin-top: 0 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] ul.list-none li > span:first-child {
      color: #050505 !important;
      font-weight: 900 !important;
    }

    .resume-paper[data-layout="blue-banner-icons"] .tag-badge {
      border: 1px solid var(--theme-border) !important;
      border-radius: 2px !important;
      background: transparent !important;
      color: var(--theme-tag-text) !important;
    }
  `,
  defaultColor: '#1e3a5f',
  defaultPageMargin: 10,
  headerMode: 'icons',
  signature: { layout: 'single-column', headerDecoration: 'solid-bar', sectionStyle: 'icon-line' },
  previewVersion: '1',
  iconMap: ICONS,
  personalInfoClass: 'blue-banner-icons-contact-icon',
};
