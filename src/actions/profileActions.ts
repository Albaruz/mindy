"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localizePath } from "@/lib/onboarding";
import { resolveRequestLocale } from "@/lib/serverLocale";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { validateSaveProfileInput, type SaveProfileInput } from "@/constants/profileValidation";

export async function saveProfileAction(
  input: SaveProfileInput,
): Promise<{ error: string | null }> {
  const validationError = validateSaveProfileInput(input);
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
