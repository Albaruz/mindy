// UI Configuration Constants
// Business-logic configuration for UI components: ranges, limits, option lists.
// Design tokens (colors, spacing, radius, shadows) live in src/styles/core/_variables.scss
// as CSS Custom Properties — the single source of truth for styling.
// Only breakpoints, z-index, and touch targets are duplicated here for TS programmatic access.

// ============================================================================
// Onboarding Wizard — Measurement & Thermal Ranges
// ============================================================================

/** Minimum body measurement accepted in onboarding (cm) */
export const MEASURE_MIN_CM = 70;

/** Maximum body measurement accepted in onboarding (cm) */
export const MEASURE_MAX_CM = 140;

/** Minimum thermal sensitivity setting (1 = very cold, 5 = very hot) */
export const THERMAL_MIN = 1;

/** Maximum thermal sensitivity setting */
export const THERMAL_MAX = 5;

/**
 * Clamps a measurement to [MEASURE_MIN_CM, MEASURE_MAX_CM] and rounds.
 * Returns MEASURE_MIN_CM if input is NaN.
 */
export function clampMeasurement(value: number): number {
  if (Number.isNaN(value)) {
    return MEASURE_MIN_CM;
  }
  return Math.min(MEASURE_MAX_CM, Math.max(MEASURE_MIN_CM, Math.round(value)));
}

/**
 * Clamps thermal value to [THERMAL_MIN, THERMAL_MAX] and rounds.
 */
export function clampThermal(value: number): number {
  return Math.min(
    THERMAL_MAX,
    Math.max(THERMAL_MIN, Math.round(value)),
  );
}

// ============================================================================
// Onboarding Wizard — Forbidden Colors
// Vetoable wardrobe colors (basic circles). Hexes are the contract with
// the server validator, so keep both lists in sync.
// ============================================================================

export const FORBIDDEN_COLOR_OPTIONS: readonly string[] = [
  "#1a1a1a", // black
  "#ffffff", // white
  "#6b4423", // brown
  "#d9c7a7", // beige
  "#b3261e", // red
  "#2f5d3a", // green
  "#2b4bd3", // blue
  "#e3b505", // yellow
];

// ============================================================================
// Onboarding Wizard — Shop Section, Style Tribe, Fit Choice
// ============================================================================

export type ShopSection = "women" | "men" | "unisex";

export const SHOP_SECTIONS: readonly ShopSection[] = [
  "women",
  "men",
  "unisex",
];

export type StyleTribe = "minimalist" | "streetwear" | "classic" | "boho";

export const STYLE_TRIBES: readonly StyleTribe[] = [
  "minimalist",
  "streetwear",
  "classic",
  "boho",
];

export type FitChoice = "oversized" | "regular" | "fitted";

export const FIT_CHOICES: readonly FitChoice[] = [
  "oversized",
  "regular",
  "fitted",
];

export type JewelryPick = "gold" | "silver";

// ============================================================================
// Onboarding Wizard — Structure
// ============================================================================

/** Number of steps in the onboarding wizard (drives progress math). */
export const TOTAL_STEPS = 5;

// ============================================================================
// Initial State Defaults (used by onboardingStore)
// ============================================================================

export const ONBOARDING_DEFAULTS = {
  displayName: "",
  section: "" as ShopSection | "",
  style: "" as StyleTribe | "",
  chestCm: 92,
  waistCm: 76,
  hipCm: 98,
  fit: "" as FitChoice | "",
  skinTone: "",
  eyeColor: "",
  jewelry: "" as JewelryPick | "",
  thermal: 3,
  forbiddenColors: [] as string[],
} as const;

// ============================================================================
// Minimal Design Tokens for TS Programmatic Access
// (Breakpoints for useMediaQuery, z-index for portals, touch targets for a11y tests)
// Source of truth: src/styles/core/_variables.scss
// ============================================================================

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
} as const;

export const touchTarget = {
  minSize: 44,   // WCAG AA minimum (px)
  comfortable: 48,
} as const;