/**
 * Shared profile validation constants and helpers.
 * Single source of truth for server and client validation.
 * Mirrors database CHECK constraints.
 */

import type { Colorimetry, Lifestyle, Morphology, PreferredFit } from "@/types/user";
import {
  SKIN_TONES,
  EYE_COLORS,
  PREFERRED_FITS,
  LIFESTYLES,
} from "@/constants/profile";
import { FORBIDDEN_COLOR_OPTIONS } from "@/constants/ui-config";
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  MEASUREMENT_MAX_CM,
  MEASUREMENT_MIN_CM,
} from "@/constants/validation";

/** Valid colorimetry seasons (matches DB CHECK constraint) */
export const COLORIMETRIES: readonly Colorimetry[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
] as const;

/** Valid body morphologies (matches DB CHECK constraint) */
export const MORPHOLOGIES: readonly Morphology[] = [
  "triangle",
  "inverted_triangle",
  "hourglass",
  "rectangle",
  "oval",
] as const;

/** Valid shopping sections (wizard step 1) */
export const SECTIONS = ["women", "men", "unisex"] as const;

/** Valid style tribes (wizard step 2) */
export const STYLES = ["minimalist", "streetwear", "classic", "boho"] as const;

/** Thermal range (wizard step 5) */
export { THERMAL_MIN, THERMAL_MAX } from "@/constants/ui-config";

/**
 * Type guard: checks if a value is one of the allowed strings.
 */
export function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

/**
 * Validates a body measurement (cm, integer, within range).
 */
export function isValidMeasurement(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MEASUREMENT_MIN_CM &&
    value <= MEASUREMENT_MAX_CM
  );
}

/**
 * Validates a display name (2-40 chars, not empty after trim).
 */
export function isValidDisplayName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= DISPLAY_NAME_MIN_LENGTH &&
    value.length <= DISPLAY_NAME_MAX_LENGTH
  );
}

/**
 * Validates thermal level (integer 1-5).
 */
import { THERMAL_MIN, THERMAL_MAX } from "@/constants/ui-config";

export function isValidThermal(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= THERMAL_MIN &&
    value <= THERMAL_MAX
  );
}

/**
 * Validates forbidden colors array (each must be in FORBIDDEN_COLOR_OPTIONS).
 */
export function isValidForbiddenColors(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (color) => typeof color === "string" && FORBIDDEN_COLOR_OPTIONS.includes(color),
    )
  );
}

/**
 * Validates a section value.
 */
export function isValidSection(value: unknown): value is (typeof SECTIONS)[number] {
  return isOneOf(value, SECTIONS);
}

/**
 * Validates a style tribe value.
 */
export function isValidStyle(value: unknown): value is (typeof STYLES)[number] {
  return isOneOf(value, STYLES);
}

/**
 * Validates a skin tone value.
 */
export function isValidSkinTone(value: unknown): value is (typeof SKIN_TONES)[number] {
  return isOneOf(value, SKIN_TONES);
}

/**
 * Validates an eye color value.
 */
export function isValidEyeColor(value: unknown): value is (typeof EYE_COLORS)[number] {
  return isOneOf(value, EYE_COLORS);
}

/**
 * Validates a preferred fit value.
 */
export function isValidPreferredFit(value: unknown): value is (typeof PREFERRED_FITS)[number] {
  return isOneOf(value, PREFERRED_FITS);
}

/**
 * Validates a lifestyle value.
 */
export function isValidLifestyle(value: unknown): value is (typeof LIFESTYLES)[number] {
  return isOneOf(value, LIFESTYLES);
}

/**
 * Validates a colorimetry value.
 */
export function isValidColorimetry(value: unknown): value is Colorimetry {
  return isOneOf(value, COLORIMETRIES);
}

/**
 * Validates a morphology value.
 */
export function isValidMorphology(value: unknown): value is Morphology {
  return isOneOf(value, MORPHOLOGIES);
}

/**
 * Complete validation for SaveProfileInput (server action).
 * Returns null on success, error message string on failure.
 */
export interface ProfileExtraPreferences {
  displayName: string;
  section: string;
  style: string;
  jewelry: string;
  thermostat: number;
  forbiddenColors: string[];
}

export interface SaveProfileInput {
  skinTone: string;
  eyeColor: string;
  chestMeasurementCm: number;
  waistMeasurementCm: number;
  hipMeasurementCm: number;
  colorimetry: Colorimetry;
  morphology: Morphology;
  preferredFit: PreferredFit;
  lifestyle: Lifestyle;
  extraPreferences: ProfileExtraPreferences;
}

export function validateSaveProfileInput(input: SaveProfileInput): string | null {
  if (!isValidSkinTone(input.skinTone)) {
    return "Select a valid skin tone.";
  }
  if (!isValidEyeColor(input.eyeColor)) {
    return "Select a valid eye color.";
  }
  if (
    !isValidMeasurement(input.chestMeasurementCm) ||
    !isValidMeasurement(input.waistMeasurementCm) ||
    !isValidMeasurement(input.hipMeasurementCm)
  ) {
    return "Measurements must be whole centimeters between 20 and 300.";
  }
  if (!isValidColorimetry(input.colorimetry)) {
    return "Invalid inferred colorimetry.";
  }
  if (!isValidMorphology(input.morphology)) {
    return "Invalid inferred morphology.";
  }
  if (!isValidPreferredFit(input.preferredFit)) {
    return "Select a valid preferred fit.";
  }
  if (!isValidLifestyle(input.lifestyle)) {
    return "Select a valid lifestyle.";
  }

  const extra = input.extraPreferences;
  if (typeof extra !== "object" || extra === null) {
    return "Missing style preferences.";
  }
  if (!isValidDisplayName(extra.displayName)) {
    return "Tell us your name (2-40 characters).";
  }
  if (!isValidSection(extra.section)) {
    return "Select a valid shopping section.";
  }
  if (!isValidStyle(extra.style)) {
    return "Select a valid style.";
  }
  if (!isValidThermal(extra.thermostat)) {
    return "Select a valid thermal level.";
  }
  if (!isValidForbiddenColors(extra.forbiddenColors)) {
    return "Select valid vetoed colors.";
  }
  return null;
}
