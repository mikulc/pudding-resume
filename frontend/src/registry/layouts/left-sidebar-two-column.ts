import type { LayoutDefinition } from './types';

/**
 * Left sidebar two-column: left profile sidebar, rounded framed paper, and compact accent headers.
 */
export const leftSidebarTwoColumnLayout: LayoutDefinition = {
  id: 'left-sidebar-two-column',
  nameKey: 'templateNames.leftSidebarTwoColumn',
  css: `
    .resume-paper[data-layout="left-sidebar-two-column"] {
      padding: 0 !important;
      color: #2e3135 !important;
      background: linear-gradient(90deg, #eef3fb 0 62mm, #ffffff 62mm 100%) !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-shell {
      display: grid !important;
      grid-template-columns: 62mm minmax(0, 1fr) !important;
      min-height: var(--resume-content-height) !important;
      overflow: hidden !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: #ffffff !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar {
      min-width: 0 !important;
      align-self: stretch !important;
      padding: var(--resume-page-margin) 0 var(--resume-page-margin) 9mm !important;
      overflow: hidden !important;
      background: #eef3fb !important;
      border-right: 1px solid #e8edf6 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-main {
      min-width: 0 !important;
      align-self: stretch !important;
      padding: var(--resume-page-margin) 11mm var(--resume-page-margin) 9mm !important;
      background: #ffffff !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-paged-flow .left-sidebar-two-column-sidebar {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-paged-flow .left-sidebar-two-column-main {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-personal {
      margin-bottom: 8mm !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-photo {
      margin-bottom: 5mm !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-photo .personal-photo,
    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-photo .personal-photo-placeholder {
      border: 1px solid rgba(139, 115, 86, 0.18) !important;
      box-shadow: 0 1px 2px rgba(48, 38, 30, 0.08) !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-name {
      margin: 0 0 1.5mm !important;
      color: var(--theme-border) !important;
      font-size: 1.7em !important;
      line-height: 1.15 !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-role {
      margin-bottom: 1mm !important;
      color: #313840 !important;
      font-size: 0.88em !important;
      line-height: var(--resume-line-spacing) !important;
      font-weight: 600 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-status {
      color: #68717a !important;
      font-size: 0.78em !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar-block {
      margin-top: 5mm !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar-title {
      margin-right: 8mm !important;
      margin-bottom: 2mm !important;
      padding-bottom: 1.5mm !important;
      border-bottom: 1.5px solid var(--theme-border) !important;
      color: var(--theme-border) !important;
      font-size: 0.95em !important;
      line-height: 1.2 !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-contact-list {
      display: grid !important;
      gap: 1.2mm !important;
      color: #3f4650 !important;
      font-size: 0.78em !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-contact-label {
      margin-right: 1mm !important;
      color: #7a838d !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-contact-icon {
      color: var(--theme-border) !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-contact-item-icon {
      display: flex !important;
      align-items: flex-start !important;
      gap: 1.6mm !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-contact-item,
    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-contact-item > span {
      min-width: 0 !important;
      max-width: 100% !important;
      overflow: hidden !important;
      white-space: nowrap !important;
      overflow-wrap: normal !important;
      word-break: normal !important;
      text-overflow: clip !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-contact-item-icon svg {
      width: 3.6mm !important;
      height: 3.6mm !important;
      margin-top: 0.35mm !important;
      flex: 0 0 auto !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .section-header {
      margin: 0 0 3mm 0 !important;
      padding: 0 !important;
      gap: 2mm !important;
      background: transparent !important;
      color: #394149 !important;
      font-size: var(--section-title-size) !important;
      line-height: 1.25 !important;
      font-weight: 800 !important;
      border: 0 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .section-header-bar {
      width: 1mm !important;
      height: 5.2mm !important;
      border-radius: 99px !important;
      background: var(--theme-border) !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar .section-header {
      margin-right: 8mm !important;
      margin-bottom: 2.5mm !important;
      padding-bottom: 1.5mm !important;
      border-bottom: 1.5px solid var(--theme-border) !important;
      color: var(--theme-border) !important;
      font-size: 0.95em !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar .section-header-bar {
      display: none !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .entity-title {
      color: #2c3035 !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .entry-title-row {
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .text-gray-700 {
      color: #3d4248 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .text-gray-500,
    .resume-paper[data-layout="left-sidebar-two-column"] .text-gray-400 {
      color: #6c747c !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] ul.list-none {
      display: grid !important;
      gap: 1mm !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] ul.list-none li > span:first-child {
      color: var(--theme-border) !important;
      font-weight: 800 !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar [data-page-section] {
      margin-bottom: 5mm !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar [data-page-section="skills"] p,
    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar [data-page-section="skills"] li,
    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar [data-page-section="summary"] li,
    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-sidebar [data-page-section="summary"] p {
      color: #3f4650 !important;
      font-size: 0.78em !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-main [data-page-section] {
      margin-bottom: 4.2mm !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .left-sidebar-two-column-main [data-section] {
      margin-bottom: 3.2mm !important;
    }

    .resume-paper[data-layout="left-sidebar-two-column"] .tag-badge {
      border: 1px solid var(--theme-border) !important;
      border-radius: 999px !important;
      background: transparent !important;
      color: var(--theme-border) !important;
    }
  `,
  defaultColor: '#248f83',
  headerMode: 'bar',
  signature: { layout: 'double-column', headerDecoration: 'side-block', sectionStyle: 'filled-title' },
  previewVersion: '1',
  personalInfoClass: 'left-sidebar-two-column-contact-icon',
  contentMode: 'sidebar',
};
