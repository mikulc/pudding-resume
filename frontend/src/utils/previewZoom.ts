export const MIN_PREVIEW_ZOOM = 0.3;
export const MAX_PREVIEW_ZOOM = 1.5;
export const PREVIEW_PAGE_WIDTH = 794;

export function normalizePreviewZoom(
  value: number,
  max = MAX_PREVIEW_ZOOM,
): number {
  const clamped = Math.max(MIN_PREVIEW_ZOOM, Math.min(max, value));
  return Math.round(clamped * 100) / 100;
}

export function calculateFitPreviewZoom(
  viewportWidth: number,
  horizontalPadding: number,
  max = MAX_PREVIEW_ZOOM,
): number {
  return normalizePreviewZoom(
    (viewportWidth - horizontalPadding) / PREVIEW_PAGE_WIDTH,
    max,
  );
}

export function stepPreviewZoom(current: number, step: number): number {
  return normalizePreviewZoom(current + step);
}

export function previewZoomFromWheel(current: number, deltaY: number): number {
  return stepPreviewZoom(current, deltaY > 0 ? -0.05 : 0.05);
}
