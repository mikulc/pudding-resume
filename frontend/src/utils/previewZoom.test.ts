import { describe, expect, it } from 'vitest';
import { MAX_PREVIEW_ZOOM, previewZoomFromWheel, stepPreviewZoom } from './previewZoom';

describe('preview zoom limits', () => {
  it('supports zooming to 200 percent', () => {
    expect(MAX_PREVIEW_ZOOM).toBe(2);
    expect(stepPreviewZoom(1.9, 0.1)).toBe(2);
    expect(previewZoomFromWheel(1.95, -1)).toBe(2);
  });

  it('clamps zoom above 200 percent', () => {
    expect(stepPreviewZoom(2, 0.1)).toBe(2);
  });
});
