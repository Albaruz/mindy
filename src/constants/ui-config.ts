// UI Configuration Constants
// Business-logic configuration for UI components: ranges, limits, option lists.
// Design tokens (colors, spacing, radius, shadows, breakpoints, z-index, touch targets)
// live in src/styles/core/_tokens.scss as CSS Custom Properties — the single source of truth.
// TS accesses them via CSS custom properties (getComputedStyle) or useMediaQuery hooks if needed.

// ============================================================================
// Onboarding Wizard — Measurement & Thermal Ranges
// ============================================================================

/** Number of garment cards rendered per closet page. */
export const CLOSET_PAGE_SIZE = 24;

/** Load a few initial closet photos eagerly so visible cards paint immediately. */
export const CLOSET_EAGER_IMAGE_COUNT = 4;

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

export const SHOP_SECTIONS = [  "women",
  "men",
  "unisex",
] as const;

export type ShopSection = (typeof SHOP_SECTIONS)[number];

export const STYLE_TRIBES = [  "minimalist",
  "streetwear",
  "classic",
  "boho",
] as const;

export type StyleTribe = (typeof STYLE_TRIBES)[number];

export const FIT_CHOICES = [  "oversized",
  "regular",
  "fitted",
] as const;

export type FitChoice = (typeof FIT_CHOICES)[number];

export type JewelryPick = "gold" | "silver";

// ============================================================================
// Onboarding Wizard — Structure
// ============================================================================

/** Number of steps in the onboarding wizard (drives progress math). */
export const TOTAL_STEPS = 6;

// ============================================================================
// Initial State Defaults (used by onboardingStore)
// ============================================================================

export const ONBOARDING_DEFAULTS = {
  displayName: "",
  section: "" as ShopSection | "",
  style: "" as StyleTribe | "",
  lifestyle: "",
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
// Design Token Access Helpers
// ============================================================================
// CSS Custom Properties are the single source of truth for:
// - Breakpoints: --breakpoint-sm, --breakpoint-md, --breakpoint-lg, --breakpoint-xl, --breakpoint-2xl
// - Z-index: --z-base, --z-dropdown, --z-sticky, --z-fixed, --z-modal-backdrop, --z-modal, --z-popover, --z-tooltip, --z-toast
// - Touch targets: --touch-target-min (44px), --touch-target-comfortable (48px)
// - Durations: --duration-fast, --duration-normal, --duration-slow, --duration-slower
//
// To access in TS, use getComputedStyle(document.documentElement).getPropertyValue('--token-name')
// or use a useMediaQuery hook that reads from CSS.
