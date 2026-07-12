import type { LayoutDefinition } from './types';

/**
 * Azure sidebar: strong blue left rail for identity and contact details, with
 * a white main reading column and restrained blue section rules.
 */
export const azureSidebarLayout: LayoutDefinition = {
  id: 'azure-sidebar',
  nameKey: 'templateNames.azureSidebar',
  css: `
    .resume-paper[data-layout="azure-sidebar"] {
      padding: 0 !important;
      color: #111111 !important;
      background: linear-gradient(90deg, var(--theme-border) 0 52mm, #ffffff 52mm 100%) !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .left-sidebar-two-column-shell {
      display: grid !important;
      grid-template-columns: 52mm minmax(0, 1fr) !important;
      min-height: var(--resume-content-height) !important;
      overflow: hidden !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .left-sidebar-two-column-shell:not(.left-sidebar-two-column-paged-flow) {
      min-height: 297mm !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .left-sidebar-two-column-sidebar {
      min-width: 0 !important;
      align-self: stretch !important;
      padding: 20mm 0 var(--resume-page-margin) 6.5mm !important;
      overflow: hidden !important;
      background: transparent !important;
      color: #ffffff !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .left-sidebar-two-column-main {
      position: relative !important;
      min-width: 0 !important;
      align-self: stretch !important;
      padding: var(--resume-page-margin) 8mm var(--resume-page-margin) 9mm !important;
      overflow: hidden !important;
      background: transparent !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .left-sidebar-two-column-main > * {
      position: relative !important;
      z-index: 1 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .left-sidebar-two-column-paged-flow .left-sidebar-two-column-sidebar,
    .resume-paper[data-layout="azure-sidebar"] .left-sidebar-two-column-paged-flow .left-sidebar-two-column-main {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-personal {
      margin-bottom: 0 !important;
      color: #ffffff !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-photo {
      margin-bottom: 7mm !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-photo .personal-photo,
    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-photo .personal-photo-placeholder {
      border: 0 !important;
      box-shadow: none !important;
      background: #f8fafc !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-name {
      margin: 0 0 11mm !important;
      color: #ffffff !important;
      font-size: 1.3em !important;
      line-height: 1.2 !important;
      font-weight: 500 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-block {
      margin-top: 8mm !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-block-title {
      margin: 0 0 3mm !important;
      color: #ffffff !important;
      font-size: 0.98em !important;
      line-height: 1.25 !important;
      font-weight: 800 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-contact-list {
      display: grid !important;
      gap: 1.5mm !important;
      color: #ffffff !important;
      font-size: 0.76em !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-contact-label {
      color: rgba(255, 255, 255, 0.88) !important;
      font-weight: 600 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-contact-icon {
      color: #ffffff !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-contact-item-icon {
      display: flex !important;
      align-items: flex-start !important;
      gap: 1.6mm !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-contact-item,
    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-contact-item > span {
      min-width: 0 !important;
      max-width: 100% !important;
      overflow: hidden !important;
      white-space: nowrap !important;
      overflow-wrap: normal !important;
      word-break: normal !important;
      text-overflow: clip !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-contact-item-icon svg {
      width: 3.6mm !important;
      height: 3.6mm !important;
      margin-top: 0.35mm !important;
      flex: 0 0 auto !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .azure-sidebar-objective {
      color: #ffffff !important;
      font-size: 0.78em !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .section-header {
      display: flex !important;
      align-items: center !important;
      gap: 0 !important;
      margin: 0 0 3mm !important;
      padding: 0 0 1.4mm !important;
      border: 0 !important;
      border-bottom: 1px solid var(--theme-border) !important;
      background: transparent !important;
      color: var(--theme-border) !important;
      font-size: var(--section-title-size) !important;
      line-height: 1.22 !important;
      font-weight: 500 !important;
      letter-spacing: 0 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .section-header-bar {
      display: none !important;
    }

    .resume-paper[data-layout="azure-sidebar"] [data-page-section] {
      margin-bottom: 4.2mm !important;
      border-radius: 0 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] [data-section] {
      margin-bottom: 3.2mm !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .entry-title-row {
      margin-bottom: 1mm !important;
      line-height: var(--resume-line-spacing) !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .entity-title {
      color: #111111 !important;
      font-weight: 900 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .text-gray-700 {
      color: #111111 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .text-gray-500,
    .resume-paper[data-layout="azure-sidebar"] .text-gray-400 {
      color: #111111 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] ul.list-none {
      display: grid !important;
      gap: 1mm !important;
    }

    .resume-paper[data-layout="azure-sidebar"] ul.list-none > :not([hidden]) ~ :not([hidden]) {
      margin-top: 0 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] ul.list-none li > span:first-child {
      color: #111111 !important;
      font-weight: 900 !important;
    }

    .resume-paper[data-layout="azure-sidebar"] .tag-badge {
      border: 1px solid var(--theme-border) !important;
      border-radius: 2px !important;
      background: transparent !important;
      color: var(--theme-tag-text) !important;
    }
  `,
  defaultColor: '#4388f6',
  headerMode: 'underline',
  signature: { layout: 'double-column', headerDecoration: 'side-block', sectionStyle: 'underline' },
  previewVersion: '1',
  personalInfoClass: 'azure-sidebar-contact-icon',
  contentMode: 'sidebar',
  sidebarSections: ['personal'],
};
