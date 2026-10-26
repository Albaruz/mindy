// Profile & Onboarding Constants
// Centralized constants for user profile, onboarding wizard, and colorimetry.
// Single source of truth for enums, inference logic.
// Color swatches/palettes are now in src/styles/core/_tokens.scss as CSS custom properties:
// --skin-fair, --skin-light, --skin-medium, --skin-olive, --skin-brown, --skin-deep
// --eye-brown, --eye-hazel, --eye-green, --eye-blue, --eye-gray, --eye-black
// --hair-black, --hair-brown, --hair-blonde, --hair-red, --hair-gray, --hair-white
// --season-spring-1..5, --season-summer-1..5, --season-autumn-1..5, --season-winter-1..5
//
// NOTE: The swatch objects below are kept for backward compatibility with components
// that need actual color values at build time (e.g., ColorSwatches inline styles).
// They MUST be kept in sync with the CSS custom properties in src/styles/core/_tokens.scss.
// Consider using the CSS variable helpers (skinToneToCssVar, etc.) for new code.

import type { FitChoice, JewelryPick } from "./ui-config";

// ============================================================================
// Enums / Option Sets (mirror database CHECK constraints)
// ============================================================================

export const SKIN_TONES = [
  "fair",
  "light",
  "medium",
  "olive",
  "brown",
  "deep",
] as const;

export type SkinTone = (typeof SKIN_TONES)[number];

export const EYE_COLORS = [
  "brown",
  "hazel",
  "green",
  "blue",
  "gray",
  "black",
] as const;

export type EyeColor = (typeof EYE_COLORS)[number];

export const HAIR_COLORS = [
  "black",
  "brown",
  "blonde",
  "red",
  "gray",
  "white",
] as const;

export type HairColor = (typeof HAIR_COLORS)[number];

export const PREFERRED_FITS = [
  "slim",
  "regular",
  "oversized",
  "mixed",
] as const;

export type PreferredFitValue = (typeof PREFERRED_FITS)[number];

/** Valid colorimetry seasons (matches DB CHECK constraint) */
export const COLORIMETRIES = [
  "spring",
  "summer",
  "autumn",
  "winter",
] as const;

export type ColorimetryValue = (typeof COLORIMETRIES)[number];

/** Valid body morphologies (matches DB CHECK constraint) */
export const MORPHOLOGIES = [
  "triangle",
  "inverted_triangle",
  "hourglass",
  "rectangle",
  "oval",
] as const;

export type MorphologyValue = (typeof MORPHOLOGIES)[number];

export const LIFESTYLES = [
  "casual_daily",
  "corporate_office",
  "active_sports",
  "home_remote",
  "social_events",
] as const;

export type LifestyleValue = (typeof LIFESTYLES)[number];

// ============================================================================
// Swatches for color pickers (onboarding wizard)
// Kept for backward compatibility - MUST stay in sync with CSS custom properties in _tokens.scss
// ============================================================================

export const SKIN_TONE_SWATCHES: Record<SkinTone, string> = {
  fair: "#fdebd7",
  light: "#f5d0a9",
  medium: "#e0ac69",
  olive: "#9c7b4f",
  brown: "#6b4423",
  deep: "#3b2213",
};

export const EYE_COLOR_SWATCHES: Record<EyeColor, string> = {
  brown: "#5c3a21",
  hazel: "#7a5c2e",
  green: "#4a7c59",
  blue: "#4a7ebb",
  gray: "#8e9aaf",
  black: "#1c1c1e",
};

export const HAIR_COLOR_SWATCHES: Record<HairColor, string> = {
  black: "#1a1a1a",
  brown: "#4e3320",
  blonde: "#d9b36a",
  red: "#b5522b",
  gray: "#9aa0a6",
  white: "#f5f0e8",
};

// ============================================================================
// Seasonal Colorimetry Palettes (5 swatches per season)
// Used in colorimetry bento card on Profile page.
// MUST stay in sync with CSS custom properties in _tokens.scss
// ============================================================================

export const SEASON_PALETTES: Record<ColorimetryValue, readonly string[]> = {
  spring: ["#f6d8a8", "#f2b880", "#e88ca0", "#9cbe8f", "#7fb3b0"],
  summer: ["#c9d4e0", "#a8b8c8", "#d8a7b1", "#b5c4b1", "#8fa3bf"],
  autumn: ["#c87966", "#a65a3a", "#d9a441", "#6b7f3e", "#5a3b2e"],
  winter: ["#1f2937", "#b3261e", "#1d4ed8", "#e8e8e8", "#0f766e"],
};

// ============================================================================
// Color Swatch Access Helpers
// CSS Custom Properties are the single source of truth for colors.
// Use these helpers to get the CSS variable name for a given enum value.
// ============================================================================

/** Maps SkinTone enum to CSS custom property name (e.g., 'fair' -> '--skin-fair') */
export function skinToneToCssVar(skinTone: SkinTone): string {
  return `--skin-${skinTone}`;
}

/** Maps EyeColor enum to CSS custom property name (e.g., 'brown' -> '--eye-brown') */
export function eyeColorToCssVar(eyeColor: EyeColor): string {
  return `--eye-${eyeColor}`;
}

/** Maps HairColor enum to CSS custom property name (e.g., 'black' -> '--hair-black') */
export function hairColorToCssVar(hairColor: HairColor): string {
  return `--hair-${hairColor}`;
}

/** Maps Colorimetry season to array of CSS custom property names for the 5 swatches */
export function seasonToCssVars(season: ColorimetryValue): readonly string[] {
  return [
    `--season-${season}-1`,
    `--season-${season}-2`,
    `--season-${season}-3`,
    `--season-${season}-4`,
    `--season-${season}-5`,
  ] as const;
}

/** Gets computed color value from CSS custom property (client-side only) */
export function getColorFromCssVar(varName: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/** Gets all 5 season swatches as computed colors (client-side only) */
export function getSeasonSwatches(season: ColorimetryValue): string[] {
  if (typeof window === "undefined") return [];
  return seasonToCssVars(season).map(getColorFromCssVar);
}

// ============================================================================
// Onboarding Inference Logic (pure functions)
// Maps indirect wizard answers → profile contract (colorimetry, morphology, fit)
// ============================================================================

// Types re-exported from ui-config for backward compatibility

/** Deep skin tones that push warm→autumn, cool→winter */
const DEEP_SKIN_TONES: readonly SkinTone[] = ["medium", "olive", "brown", "deep"];

/**
 * Infers colorimetry season from skin tone + jewelry preference.
 * Warm (gold) + deep = autumn, warm + fair = spring
 * Cool (silver) + deep = winter, cool + fair = summer
 * Skipped jewelry (optional step) falls back to the cool branch so the
 * result stays deterministic from skin tone alone.
 */
export function inferColorimetry(
  skinTone: string,
  jewelry: JewelryPick | "",
): ColorimetryValue {
  const deepSkin = DEEP_SKIN_TONES.includes(skinTone.toLowerCase() as SkinTone);
  if (jewelry === "gold") {
    return deepSkin ? "autumn" : "spring";
  }
  return deepSkin ? "winter" : "summer";
}

/**
 * Infers body morphology from chest/waist/hip measurements (cm).
 * Thresholds mirror server-side inferProfile for consistency.
 */
export function inferMorphology(
  chestCm: number,
  waistCm: number,
  hipCm: number,
): MorphologyValue {
  if (hipCm - chestCm > 3) {
    return "triangle";
  }
  if (chestCm - hipCm > 3) {
    return "inverted_triangle";
  }
  if (chestCm - waistCm > 12 && hipCm - waistCm > 12) {
    return "hourglass";
  }
  if (waistCm >= chestCm - 3 && waistCm >= hipCm - 3) {
    return "oval";
  }
  return "rectangle";
}

/** Maps FitChoice (wizard) → PreferredFit (profile) */
export function mapFitToPreferredFit(fit: FitChoice): PreferredFitValue {
  switch (fit) {
    case "fitted":
      return "slim";
    case "regular":
      return "regular";
    case "oversized":
      return "oversized";
  }
}
