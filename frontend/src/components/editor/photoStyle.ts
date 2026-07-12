import { DEFAULT_PERSONAL_PHOTO_STYLE, type PersonalPhotoStyle } from '../../types/resume';

export const PINNED_PERSONAL_FIELD = 'fullName';
export const DEFAULT_PHOTO_STYLE = DEFAULT_PERSONAL_PHOTO_STYLE;
export const PHOTO_STYLE_PANEL_WIDTH = 312;
export const PHOTO_STYLE_LIMITS = {
  minSize: 32,
  maxSize: 240,
  minRadius: 0,
  maxRadius: 999,
};
export const PHOTO_ASPECT_OPTIONS = [
  { key: '1:1', label: '1:1', ratio: 1 },
  { key: '3:4', label: '3:4', ratio: 3 / 4 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
] as const;
export type PhotoAspectKey = typeof PHOTO_ASPECT_OPTIONS[number]['key'] | 'original' | 'custom';
export const PHOTO_RADIUS_OPTIONS = [
  { key: 'square', value: 0 },
  { key: 'rounded', value: 12 },
] as const;
export type PhotoRadiusKey = typeof PHOTO_RADIUS_OPTIONS[number]['key'] | 'custom';

export function normalizePersonalFieldOrder(order: string[]): string[] {
  return [PINNED_PERSONAL_FIELD, ...order.filter((field) => field !== PINNED_PERSONAL_FIELD)];
}

export function normalizePhotoStyle(style?: Partial<PersonalPhotoStyle>): PersonalPhotoStyle {
  return {
    width: clampNumber(style?.width ?? DEFAULT_PHOTO_STYLE.width, PHOTO_STYLE_LIMITS.minSize, PHOTO_STYLE_LIMITS.maxSize),
    height: clampNumber(style?.height ?? DEFAULT_PHOTO_STYLE.height, PHOTO_STYLE_LIMITS.minSize, PHOTO_STYLE_LIMITS.maxSize),
    borderRadius: clampNumber(style?.borderRadius ?? DEFAULT_PHOTO_STYLE.borderRadius, PHOTO_STYLE_LIMITS.minRadius, PHOTO_STYLE_LIMITS.maxRadius),
  };
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function parseDimensionInput(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clampNumber(parsed, PHOTO_STYLE_LIMITS.minSize, PHOTO_STYLE_LIMITS.maxSize);
}
