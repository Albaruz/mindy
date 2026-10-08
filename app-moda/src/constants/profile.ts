// Profile & Onboarding Constants
// Centralized constants for user profile, onboarding wizard, and colorimetry.
// Single source of truth for enums, swatches, palettes, and inference logic.

import type { Colorimetry, Lifestyle, Morphology, PreferredFit } from "@/types/user";
import type { FitChoice, JewelryPick, StyleTribe } from "./ui-config";

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
// ============================================================================

export const SEASON_PALETTES: Record<Colorimetry, readonly string[]> = {
  spring: ["#f6d8a8", "#f2b880", "#e88ca0", "#9cbe8f", "#7fb3b0"],
  summer: ["#c9d4e0", "#a8b8c8", "#d8a7b1", "#b5c4b1", "#8fa3bf"],
  autumn: ["#c87966", "#a65a3a", "#d9a441", "#6b7f3e", "#5a3b2e"],
  winter: ["#1f2937", "#b3261e", "#1d4ed8", "#e8e8e8", "#0f766e"],
};

// ============================================================================
// Onboarding Inference Logic (pure functions)
// Maps indirect wizard answers → profile contract (colorimetry, morphology, fit, lifestyle)
// ============================================================================

// Types re-exported from ui-config for backward compatibility
export type { FitChoice, JewelryPick, StyleTribe };

/** Deep skin tones that push warm→autumn, cool→winter */
const DEEP_SKIN_TONES: readonly SkinTone[] = ["medium", "olive", "brown", "deep"];

/**
 * Infers colorimetry season from skin tone + jewelry preference.
 * Warm (gold) + deep = autumn, warm + fair = spring
 * Cool (silver) + deep = winter, cool + fair = summer
 */
export function inferColorimetry(
  skinTone: string,
  jewelry: JewelryPick,
): Colorimetry {
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
): Morphology {
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

/** Maps StyleTribe (wizard) → Lifestyle (profile) */
export function mapStyleToLifestyle(style: StyleTribe): Lifestyle {
  switch (style) {
    case "minimalist":
      return "casual_daily";
    case "classic":
      return "corporate_office";
    case "streetwear":
      return "social_events";
    case "boho":
      return "home_remote";
  }
}

/** Maps FitChoice (wizard) → PreferredFit (profile) */
export function mapFitToPreferredFit(fit: FitChoice): PreferredFit {
  switch (fit) {
    case "fitted":
      return "slim";
    case "regular":
      return "regular";
    case "oversized":
      return "oversized";
  }
}