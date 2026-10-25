// Closet UI data for the closed garment vocabularies. The const arrays live in
// constants/garment.ts (single source of truth); normalization lives in
// lib/garment/normalizers.ts.
import {
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
} from "@/constants/garment";
import type { GarmentColor } from "@/types/garment";

export {
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
};

// Legacy names used by the form modal.
export const GARMENT_TYPES = GARMENT_TYPE_VALUES;
export const GARMENT_STYLES = GARMENT_STYLE_VALUES;
export const GARMENT_CUTS = GARMENT_CUT_VALUES;
export const GARMENT_MATERIALS = GARMENT_MATERIAL_VALUES;
export const GARMENT_COLORS = GARMENT_COLOR_VALUES;
export const GARMENT_SEASONS = GARMENT_SEASON_VALUES;

// Basic color circles for the form picker (closed set, one per base).
export const GARMENT_COLOR_SWATCHES: Record<GarmentColor, string> = {
  black: "#232323",
  white: "#ffffff",
  gray: "#9aa0a6",
  beige: "#e6d7b8",
  brown: "#6b4423",
  navy: "#274a78",
  blue: "#4a7ebb",
  red: "#c0392b",
  pink: "#f0a8bb",
  green: "#4a7c59",
  yellow: "#f2d060",
  orange: "#e67e22",
  purple: "#7d5ba6",
};
