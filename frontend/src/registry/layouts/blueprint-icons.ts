import type { LayoutDefinition } from './types';
import { ICONS } from './cyanblu-icons';

/**
 * Blueprint icons: single-column resume with a left-aligned header, circular
 * blue section icons, fine dividers, and a light blueprint-like arc motif.
 */
export const blueprintIconsLayout: LayoutDefinition = {
  id: 'blueprint-icons',
  nameKey: 'templateNames.blueprintIcons',
  css: `
    .resume-paper[data-layout="blueprint-icons"] {
      color: #292d33 !important;
      background: #ffffff !important;
    }

    .resume-paper[data-layout="blueprint-icons"]::before,
    .resume-paper[data-layout="blueprint-icons"]::after {
      content: "" !important;
      position: absolute !important;
      pointer-events: none !important;
      border: 1px solid color-mix(in srgb, var(--theme-border) 18%, transparent) !important;
      border-radius: 50% !important;
      z-index: 0 !important;
    }

    .resume-paper[data-layout="blueprint-icons"]::before {
      left: -28mm !important;
      top: -24mm !important;
      width: 92mm !important;
      height: 58mm !important;
      transform: rotate(-18deg) !important;
    }

    .resume-paper[data-layout="blueprint-icons"]::after {
      left: 16mm !important;
      top: -17mm !important;
      width: 72mm !important;
      height: 45mm !important;
      transform: rotate(20deg) !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] {
      position: relative !important;
      min-height: 30mm !important;
      margin-bottom: 7mm !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] > div {
      position: relative !important;
      display: block !important;
      min-height: 30mm !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] .flex-1 {
      width: 100% !important;
      padding: 0 34mm 0 0 !important;
      text-align: left !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] h1,
    .resume-paper[data-layout="blueprint-icons"] .blueprint-icons-name {
      margin: 0 0 5mm !important;
      color: #0d1117 !important;
      font-size: 1.72em !important;
      line-height: 1.12 !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] .flex-1 > div {
      justify-content: flex-start !important;
      gap: 0 !important;
      margin-bottom: 1.4mm !important;
      color: #333333 !important;
      font-size: 0.95em !important;
      font-weight: 500 !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .blueprint-icons-contact-item + .blueprint-icons-contact-item::before {
      content: "|" !important;
      display: inline-block !important;
      margin: 0 2mm !important;
      color: #30343a !important;
      font-weight: 600 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] svg {
      display: none !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] .personal-photo,
    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] .personal-photo-placeholder {
      position: absolute !important;
      top: 0 !important;
      right: 0 !important;
      border: 1px solid color-mix(in srgb, var(--theme-border) 22%, #ffffff) !important;
      box-shadow: none !important;
      background: var(--theme-bg) !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] > .flex-row-reverse .personal-photo,
    .resume-paper[data-layout="blueprint-icons"] [data-page-section="personal"] > .flex-row-reverse .personal-photo-placeholder {
      right: auto !important;
      left: 0 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .section-header {
      display: flex !important;
      align-items: center !important;
      gap: 2mm !important;
      margin: 0 0 2.6mm !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      color: var(--theme-border) !important;
      font-size: var(--section-title-size) !important;
      line-height: 1.2 !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .section-header::after {
      content: "" !important;
      display: block !important;
      height: 1px !important;
      flex: 1 1 auto !important;
      background: color-mix(in srgb, var(--theme-border) 18%, #ffffff) !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .section-header-bar {
      display: none !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .section-header-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 5.2mm !important;
      height: 5.2mm !important;
      border-radius: 50% !important;
      background: var(--theme-border) !important;
      flex: 0 0 auto !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .section-header-icon svg {
      display: block !important;
      width: 3.1mm !important;
      height: 3.1mm !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-page-section] {
      margin-bottom: 4.2mm !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] [data-section] {
      margin-bottom: 3.2mm !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .entry-title-row {
      margin-bottom: 1.2mm !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .entity-title {
      color: #111111 !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .text-gray-700 {
      color: #30343a !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .text-gray-500,
    .resume-paper[data-layout="blueprint-icons"] .text-gray-400 {
      color: #3f4650 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] ul.list-none {
      display: grid !important;
      gap: 1.15mm !important;
    }

    .resume-paper[data-layout="blueprint-icons"] ul.list-none > :not([hidden]) ~ :not([hidden]) {
      margin-top: 0 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] ul.list-none li > span:first-child {
      color: #0f172a !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="blueprint-icons"] .tag-badge {
      border: 1px solid var(--theme-border) !important;
      border-radius: 2px !important;
      background: transparent !important;
      color: var(--theme-tag-text) !important;
    }
  `,
  defaultColor: '#4F8CFF',
  headerMode: 'icons',
  signature: { layout: 'single-column', headerDecoration: 'rings', sectionStyle: 'icon-line' },
  previewVersion: '1',
  iconMap: ICONS,
  personalInfoClass: 'blueprint-icons-contact-icon',
};
