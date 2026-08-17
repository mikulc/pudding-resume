import { deriveThemeColors, resolveThemeColor, type ThemeSettings } from '../types/resume';

export async function waitForPaginationReady(container: HTMLElement): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (!container.querySelector('[data-pagination-state="measuring"]')) return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

export function buildExportThemeCSS(theme: ThemeSettings): string {
  const colors = deriveThemeColors(resolveThemeColor(theme));

  return `
    .resume-paper {
      --theme-bg: ${colors.bg};
      --theme-border: ${colors.border};
      --layout-accent: ${colors.border};
    }
    .resume-paper .section-header {
      background-color: ${colors.bg} !important;
      color: ${colors.border} !important;
      border-bottom-color: ${colors.border} !important;
    }
    .resume-paper .section-header-bar {
      background-color: ${colors.border} !important;
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
