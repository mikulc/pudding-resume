import type { WatermarkSettings } from '../../types/resume';
import { convertImagesToBase64, inlineAllStyles, removeDiagnosisMarks, removeExportExcluded, removeInteractiveAttributes } from './domStyles';
import { applyExportLayoutStability, setImportantStyle } from './layout';

function createContinuousWatermarkOverlay(settings: WatermarkSettings): HTMLElement | null {
  if (!settings.enabled || !settings.content.trim()) {
    return null;
  }

  const densityMap = {
    low: { cols: 3, rowHeight: '148.5mm', rows: 16 },
    medium: { cols: 4, rowHeight: '99mm', rows: 24 },
    high: { cols: 5, rowHeight: '59.4mm', rows: 40 },
  };
  const { cols, rowHeight, rows } = densityMap[settings.density];
  const overlay = document.createElement('div');

  overlay.setAttribute('data-watermark-overlay', 'true');
  overlay.setAttribute('style', `
    position: absolute !important;
    inset: 0 !important;
    display: grid !important;
    grid-template-columns: repeat(${cols}, 1fr) !important;
    grid-auto-rows: ${rowHeight} !important;
    pointer-events: none !important;
    user-select: none !important;
    overflow: hidden !important;
    z-index: 0 !important;
  `);

  for (let i = 0; i < cols * rows; i += 1) {
    const cell = document.createElement('div');
    cell.textContent = settings.content;
    cell.setAttribute('style', `
      align-self: center !important;
      justify-self: center !important;
      transform: rotate(${settings.rotation}deg) !important;
      font-size: ${settings.fontSize}px !important;
      color: ${settings.color} !important;
      opacity: ${settings.opacity} !important;
      font-weight: 600 !important;
      white-space: nowrap !important;
    `);
    overlay.appendChild(cell);
  }

  return overlay;
}

async function processElementHTMLWithTransform(
  element: HTMLElement,
  transformClone?: (clone: HTMLElement) => void,
): Promise<string> {
  const markerId = '__export_root__';
  const oldId = element.id;
  element.id = markerId;

  try {
    const clone = element.cloneNode(true) as HTMLElement;
    inlineAllStyles(clone);
    removeExportExcluded(clone);
    removeDiagnosisMarks(clone);
    transformClone?.(clone);
    await convertImagesToBase64(clone);
    removeInteractiveAttributes(clone);
    return clone.outerHTML;
  } finally {
    if (oldId) {
      element.id = oldId;
    } else {
      element.removeAttribute('id');
    }
  }
}

export async function processElementHTML(element: HTMLElement): Promise<string> {
  return processElementHTMLWithTransform(element, applyExportLayoutStability);
}

export async function processPNGElementHTML(element: HTMLElement): Promise<string> {
  return processElementHTMLWithTransform(element, applyExportLayoutStability);
}

export async function processContinuousPNGPageHTML(
  element: HTMLElement,
  pageIndex: number,
  pageCount: number,
  watermark?: WatermarkSettings,
): Promise<string> {
  return processElementHTMLWithTransform(element, (clone) => {
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === pageCount - 1;

    clone.classList.add('png-continuous-paper');
    setImportantStyle(clone, 'display', 'block');
    setImportantStyle(clone, 'height', 'auto');
    setImportantStyle(clone, 'max-height', 'none');
    setImportantStyle(clone, 'min-height', '0');
    setImportantStyle(clone, 'overflow', 'visible');
    setImportantStyle(clone, 'margin', '0');
    setImportantStyle(clone, 'box-shadow', 'none');
    setImportantStyle(clone, 'z-index', '1');
    setImportantStyle(clone, 'page-break-after', 'auto');
    setImportantStyle(clone, 'break-after', 'auto');
    setImportantStyle(clone, 'float', 'none');
    setImportantStyle(clone, 'clear', 'none');
    clone.querySelectorAll('[data-watermark-overlay="true"]').forEach((overlay) => {
      overlay.remove();
    });
    const watermarkOverlay = watermark ? createContinuousWatermarkOverlay(watermark) : null;
    if (watermarkOverlay) {
      clone.insertBefore(watermarkOverlay, clone.firstChild);
    }

    if (!isFirstPage) {
      setImportantStyle(clone, 'padding-top', '0');
    }
    if (!isLastPage) {
      setImportantStyle(clone, 'padding-bottom', '0');
    }
    applyExportLayoutStability(clone);
  });
}
