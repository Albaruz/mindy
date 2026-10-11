"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localizePath } from "@/lib/onboarding";
import { resolveRequestLocale } from "@/lib/serverLocale";
import { FORBIDDEN_COLOR_OPTIONS } from "@/constants/ui-config";
import {
  EYE_COLORS,
  SKIN_TONES,
} from "@/constants/profile";
import { THERMAL_MAX, THERMAL_MIN } from "@/constants/ui-config";
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  MEASUREMENT_MAX_CM,
  MEASUREMENT_MIN_CM,
} from "@/constants/validation";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import type {
  Colorimetry,
  Lifestyle,
  Morphology,
  PreferredFit,
} from "@/types/user";

// Payload from the 5-step immersive wizard. Identity answers (name,
// section, style) and fine-tuning (thermostat, vetoed colors) have no
// dedicated columns and travel inside extra_preferences (JSONB).
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
  extraPreferences: {
    displayName: string;
    section: string;
    style: string;
    jewelry: string;
    thermostat: number;
    forbiddenColors: string[];
  };
}

const COLORIMETRIES: readonly Colorimetry[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

const MORPHOLOGIES: readonly Morphology[] = [
  "triangle",
  "inverted_triangle",
  "hourglass",
  "rectangle",
  "oval",
];

const PREFERRED_FITS: readonly PreferredFit[] = [
  "slim",
  "regular",
  "oversized",
  "mixed",
];

const LIFESTYLES: readonly Lifestyle[] = [
  "casual_daily",
  "corporate_office",
  "active_sports",
  "home_remote",
  "social_events",
];

const SECTIONS: readonly string[] = ["women", "men", "unisex"];
const STYLES: readonly string[] = [
  "minimalist",
  "streetwear",
  "classic",
  "boho",
];

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isValidMeasurement(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MEASUREMENT_MIN_CM &&
    value <= MEASUREMENT_MAX_CM
  );
}

function validateInput(input: SaveProfileInput): string | null {
  if (!isOneOf(input.skinTone, SKIN_TONES)) {
    return "Select a valid skin tone.";
  }
  if (!isOneOf(input.eyeColor, EYE_COLORS)) {
    return "Select a valid eye color.";
  }
  if (
    !isValidMeasurement(input.chestMeasurementCm) ||
    !isValidMeasurement(input.waistMeasurementCm) ||
    !isValidMeasurement(input.hipMeasurementCm)
  ) {
    return "Measurements must be whole centimeters between 20 and 300.";
  }
  if (!isOneOf(input.colorimetry, COLORIMETRIES)) {
    return "Invalid inferred colorimetry.";
  }
  if (!isOneOf(input.morphology, MORPHOLOGIES)) {
    return "Invalid inferred morphology.";
  }
  if (!isOneOf(input.preferredFit, PREFERRED_FITS)) {
    return "Select a valid preferred fit.";
  }
  if (!isOneOf(input.lifestyle, LIFESTYLES)) {
    return "Select a valid lifestyle.";
  }
  const extra = input.extraPreferences;
  if (typeof extra !== "object" || extra === null) {
    return "Missing style preferences.";
  }
  if (
    typeof extra.displayName !== "string" ||
    extra.displayName.trim().length < DISPLAY_NAME_MIN_LENGTH ||
    extra.displayName.length > DISPLAY_NAME_MAX_LENGTH
  ) {
    return "Tell us your name (2-40 characters).";
  }
  if (!SECTIONS.includes(extra.section)) {
    return "Select a valid shopping section.";
  }
  if (!STYLES.includes(extra.style)) {
    return "Select a valid style.";
  }
  if (
    !Number.isInteger(extra.thermostat) ||
    extra.thermostat < THERMAL_MIN ||
    extra.thermostat > THERMAL_MAX
  ) {
    return "Select a valid thermal level.";
  }
  if (
    !Array.isArray(extra.forbiddenColors) ||
    extra.forbiddenColors.some(
      (color): boolean =>
        typeof color !== "string" || !FORBIDDEN_COLOR_OPTIONS.includes(color),
    )
  ) {
    return "Select valid vetoed colors.";
  }
  return null;
}

export async function saveProfileAction(
  input: SaveProfileInput,
): Promise<{ error: string | null }> {
  const validationError = validateInput(input);
  if (validationError !== null) {
    return { error: validationError };
  }

  const supabase = await createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "You must be signed in to save your profile." };
    }

    // Merge with stored preferences so unrelated keys survive rewrites.
    const { data: existing } = await supabase
      .from(TABLES.profiles)
      .select("extra_preferences")
      .eq(USER_ID_COLUMN, user.id)
      .maybeSingle();
    const stored =
      existing !== null &&
      typeof (existing as Record<string, unknown>).extra_preferences ===
        "object"
        ? ((existing as Record<string, unknown>).extra_preferences as Record<
            string,
            unknown
          >)
        : {};

    // Upsert: the signup trigger normally pre-creates the row, but older
    // accounts may not have one yet.
    const { error } = await supabase.from(TABLES.profiles).upsert(
      {
        user_id: user.id,
        skin_tone: input.skinTone,
        eye_color: input.eyeColor,
        hair_color: null,
        chest_measurement_cm: input.chestMeasurementCm,
        waist_measurement_cm: input.waistMeasurementCm,
        hip_measurement_cm: input.hipMeasurementCm,
        colorimetry: input.colorimetry,
        morphology: input.morphology,
        preferred_fit: input.preferredFit,
        lifestyle: input.lifestyle,
        extra_preferences: {
          ...stored,
          displayName: input.extraPreferences.displayName.trim(),
          section: input.extraPreferences.section,
          style: input.extraPreferences.style,
          jewelry: input.extraPreferences.jewelry,
          thermostat: input.extraPreferences.thermostat,
          forbiddenColors: [...input.extraPreferences.forbiddenColors],
        },
      },
      { onConflict: USER_ID_COLUMN },
    );
    if (error) {
      return { error: "Could not save your profile. Try again." };
    }
  } catch {
    return {
      error: "Could not reach the database. Try again.",
    };
  }

  const locale = await resolveRequestLocale();
  revalidatePath(localizePath("/profile", locale));
  // No server redirect: the client transitions to the success screen first
  // and navigates to the closet from there.
  return { error: null };
}
