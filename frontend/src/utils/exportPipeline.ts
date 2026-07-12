import type { ThemeSettings } from '../types/resume';

const THEME_COLORS = {
  blue: { bg: '#DBEAFE', border: '#3B82F6', tagBg: '#EFF6FF', tagText: '#2563EB' },
  gray: { bg: '#F3F4F6', border: '#6B7280', tagBg: '#F9FAFB', tagText: '#4B5563' },
  black: { bg: '#E5E7EB', border: '#374151', tagBg: '#F3F4F6', tagText: '#1F2937' },
} as const;

export async function waitForPaginationReady(container: HTMLElement): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (!container.querySelector('[data-pagination-state="measuring"]')) return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

export function buildExportThemeCSS(theme: ThemeSettings): string {
  const colors = theme.colorTheme === 'custom'
    ? (theme.customColors || THEME_COLORS.blue)
    : THEME_COLORS[theme.colorTheme];

  return `
    .resume-paper {
      --theme-bg: ${colors.bg};
      --theme-border: ${colors.border};
      --theme-tag-bg: ${colors.tagBg};
      --theme-tag-text: ${colors.tagText};
      --layout-accent: ${colors.border};
      --layout-tag-border: ${colors.tagText};
    }
    .resume-paper .section-header {
      background-color: ${colors.bg} !important;
      color: ${colors.border} !important;
      border-bottom-color: ${colors.border} !important;
    }
    .resume-paper .section-header-bar {
      background-color: ${colors.border} !important;
    }
    .resume-paper .tag-badge {
      background-color: ${colors.tagBg} !important;
      color: ${colors.tagText} !important;
    }
  `;
}

export function sanitizeExportFileName(name: string | undefined, fallback: string): string {
  return (name || '').replace(/[<>:"/\\|?*]/g, '').trim() || fallback;
}

export function createExportSnapshot(container: HTMLElement): {
  snapshot: HTMLElement;
  dispose: () => void;
} {
  const snapshot = container.cloneNode(true) as HTMLElement;
  snapshot.style.transform = '';
  snapshot.style.transformOrigin = '';
  snapshot.style.position = '';
  snapshot.style.width = '';
  snapshot.style.maxWidth = '';
  snapshot.querySelectorAll('[data-photo-placeholder]').forEach((element) => element.remove());

  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    width: '794px',
    maxWidth: 'none',
  });
  wrapper.style.setProperty('-webkit-text-size-adjust', '100%');
  wrapper.style.setProperty('text-size-adjust', '100%');
  wrapper.appendChild(snapshot);
  document.body.appendChild(wrapper);

  return { snapshot, dispose: () => wrapper.remove() };
}

export function downloadExportBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
