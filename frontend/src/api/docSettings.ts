/**
 * Document Settings API client — fetches configurable document settings from backend.
 * All endpoints are public (no auth required).
 */
import { api } from '../utils/api';
import {
  CUSTOM_COLOR_DEFAULTS,
  THEME_DEFAULTS,
  PAGE_RANGES,
  WATERMARK_RANGES,
  DENSITY_OPTIONS,
  WATERMARK_DEFAULTS,
} from '../config/defaults';

// ---- Raw API response types ----

export interface ApiDocSetting {
  id: string;
  category: string;
  label: string;
  data: unknown;
  sort_order: number;
}

// ---- Parsed data types ----

export interface PresetColor {
  color: string;
  label?: string;
  labelKey?: string;
}

export interface LayoutDefault {
  layout_id: string;
  color: string;
}

export interface ThemeDefault {
  page_margin: number;
  line_spacing: number;
  font_size: number;
}

export interface CustomColorDefault {
  bg: string;
  border: string;
  tag_bg: string;
  tag_text: string;
}

export interface SliderRange {
  key: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  default: number;
  label?: string;
  labelKey?: string;
}

export interface DensityOption {
  value: string;
  label?: string;
  labelKey?: string;
}

/** Parsed document settings from all categories */
export interface DocSettingsData {
  presetColors: PresetColor[];
  watermarkColors: PresetColor[];
  customColorDefaults: CustomColorDefault;
  layoutDefaultColors: Record<string, string>;
  themeDefaults: ThemeDefault;
  pageRanges: SliderRange[];
  watermarkRanges: SliderRange[];
  watermarkDensity: DensityOption[];
  watermarkDefaults: {
    enabled: boolean;
    content: string;
    opacity: number;
    fontSize: number;
    rotation: number;
    color: string;
    density: string;
  };
}

// ---- Fetch functions ----

/** Fetch all document settings and parse into a structured format */
export async function getParsedDocSettings(): Promise<DocSettingsData> {
  const res = await api.get<{ settings: ApiDocSetting[] }>(`/api/doc-settings`);
  const settings = res.settings || [];

  const byId = new Map<string, unknown>();
  for (const s of settings) {
    byId.set(s.id, s.data);
  }

  return {
    presetColors: (byId.get('preset_colors') as PresetColor[]) || [],
    watermarkColors: (byId.get('watermark_colors') as PresetColor[]) || [],
    customColorDefaults: (byId.get('custom_color_defaults') as CustomColorDefault) || { ...CUSTOM_COLOR_DEFAULTS },
    layoutDefaultColors: Object.fromEntries(
      ((byId.get('layout_default_colors') as LayoutDefault[]) || []).map(d => [d.layout_id, d.color]),
    ),
    themeDefaults: (byId.get('theme_defaults') as ThemeDefault) || { ...THEME_DEFAULTS },
    pageRanges: (byId.get('page_ranges') as SliderRange[]) || [...PAGE_RANGES],
    watermarkRanges: (byId.get('watermark_ranges') as SliderRange[]) || [...WATERMARK_RANGES],
    watermarkDensity: (byId.get('watermark_density') as DensityOption[]) || [...DENSITY_OPTIONS],
    watermarkDefaults: (byId.get('watermark_defaults') as any) || { ...WATERMARK_DEFAULTS },
  };
}
