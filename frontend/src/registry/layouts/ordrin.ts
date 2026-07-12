import type { LayoutDefinition } from './types';

/** Black line minimal layout with sparse dividers. */
export const ordrinLayout: LayoutDefinition = {
  id: 'ordrin',
  nameKey: 'templateNames.ordrin',
  css: `
    .resume-paper {
      background: #ffffff !important;
    }

    /* ---- Name heading always black ---- */
    .resume-paper .ordrin-branding {
      display: block !important;
      font-size: 2em !important;
      font-weight: 800 !important;
      color: #000000 !important;
      letter-spacing: 0.03em !important;
      margin-bottom: 12px !important;
    }

    /* ---- Section header: transparent background + themed underline ---- */
    .resume-paper .section-header {
      background-color: transparent !important;
      padding: 0 0 10px 0 !important;
      margin-bottom: 14px !important;
      border-bottom: 1.5px solid var(--theme-border) !important;
      font-size: var(--section-title-size) !important;
      font-weight: 700 !important;
      color: var(--theme-border) !important;
      letter-spacing: 0.02em !important;
    }
    .resume-paper .section-header .section-header-bar {
      display: none !important;
    }

    /* ---- Tags: white background + themed border/text ---- */
    .resume-paper .tag-badge {
      background-color: transparent !important;
      color: var(--theme-border) !important;
      border: 1px solid var(--theme-border) !important;
      border-radius: 2px !important;
      padding: 2px 10px !important;
      font-size: 0.857em !important;
      font-weight: 500 !important;
    }

    /* ---- Contact icons ---- */
    .resume-paper .ordrin-contact-icon {
      color: var(--theme-border) !important;
    }

    /* ---- Education / work: content left, date right ---- */
    .resume-paper .ordrin-entity-title {
      font-size: var(--entry-title-size) !important;
      font-weight: 700 !important;
      color: var(--theme-border) !important;
    }
    .resume-paper .ordrin-entity-time {
      font-size: 0.929em !important;
      color: #555 !important;
      font-weight: 400 !important;
    }
    .resume-paper .ordrin-entity-sub {
      font-size: 0.857em !important;
      color: #666 !important;
      margin-top: 2px !important;
    }

    /* ---- Skill subheadings ---- */
    .resume-paper .ordrin-skill-category {
      font-size: 1em !important;
      font-weight: 700 !important;
      color: var(--theme-border) !important;
      margin-bottom: 4px !important;
    }
    .resume-paper .ordrin-skill-desc {
      font-size: 0.929em !important;
      color: #333 !important;
      line-height: var(--resume-line-spacing) !important;
    }

    /* ---- Section spacing ---- */
    .resume-paper [data-section] {
      margin-bottom: 8px !important;
    }
  `,
  defaultColor: '#000000',
  headerMode: 'underline',
  signature: { layout: 'single-column', headerDecoration: 'none', sectionStyle: 'underline' },
  previewVersion: '1',
  personalInfoClass: 'ordrin-contact-icon',
};
