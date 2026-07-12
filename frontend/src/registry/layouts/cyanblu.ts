import type { LayoutDefinition } from './types';
import { ICONS } from './cyanblu-icons';

/** Cyan round icon layout with thin section dividers. */
export const cyanbluLayout: LayoutDefinition = {
  id: 'cyanblu',
  nameKey: 'templateNames.cyanblu',
  css: `
    /* ---- Global ---- */
    .resume-paper {
      color: #1a1a1a !important;
      background: #ffffff !important;
    }

    /* ---- Section header: transparent background + themed round icon + divider ---- */
    .resume-paper .section-header {
      background-color: transparent !important;
      padding: 4px 0 10px 0 !important;
      margin-bottom: 14px !important;
      border-bottom: 1.5px solid var(--theme-border) !important;
      font-size: var(--section-title-size) !important;
      font-weight: 700 !important;
      color: var(--theme-border) !important;
      gap: 10px !important;
    }

    /* Hide legacy bar and use round icon container */
    .resume-paper .section-header > .section-header-bar {
      display: none !important;
    }

    /* Round icon container follows theme color */
    .resume-paper .section-header-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 24px !important;
      height: 24px !important;
      border-radius: 50% !important;
      background-color: var(--theme-border) !important;
      flex-shrink: 0 !important;
    }

    /* Contact icons follow theme color */
    .resume-paper .cyanblu-contact-icon {
      color: var(--theme-border) !important;
    }

    /* ---- Tags ---- */
    .resume-paper .tag-badge {
      border-radius: 9999px !important;
      padding: 2px 12px !important;
      border: 1px solid var(--theme-tag-text) !important;
      background-color: transparent !important;
      color: var(--theme-tag-text) !important;
    }

    /* ---- Education / work: name row + right-aligned date ---- */
    .resume-paper .cyanblu-entity-title {
      font-weight: 700 !important;
      font-size: var(--entry-title-size) !important;
      color: #1a1a1a !important;
    }
    .resume-paper .cyanblu-entity-time {
      font-size: 0.929em !important;
      color: #555 !important;
      font-weight: 400 !important;
    }
    .resume-paper .cyanblu-entity-sub {
      font-size: 0.857em !important;
      color: #666 !important;
      margin-top: 2px !important;
    }

    /* ---- Skill subheadings ---- */
    .resume-paper .cyanblu-skill-category {
      font-size: 1em !important;
      font-weight: 700 !important;
      color: #1a1a1a !important;
      margin-bottom: 4px !important;
    }
    .resume-paper .cyanblu-skill-desc {
      font-size: 0.929em !important;
      color: #333 !important;
      line-height: var(--resume-line-spacing) !important;
    }

    /* ---- Ordered list numbers follow theme color ---- */
    .resume-paper .cyanblu-list-number {
      color: var(--theme-border) !important;
      font-weight: 600 !important;
    }

    /* ---- Section spacing ---- */
    .resume-paper [data-section] {
      margin-bottom: 8px !important;
    }
  `,
  defaultColor: '#1e3a5f',
  headerMode: 'icons',
  signature: { layout: 'single-column', headerDecoration: 'none', sectionStyle: 'icon-line' },
  previewVersion: '1',
  iconMap: ICONS,
  personalInfoClass: 'cyanblu-contact-icon',
};
