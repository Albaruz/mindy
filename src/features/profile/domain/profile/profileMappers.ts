import type {
  Colorimetry,
  Lifestyle,
  Morphology,
  PreferredFit,
  UserProfile,
} from "@/types/user";

// Row shape of public.profiles (snake_case, as returned by Supabase).
export interface ProfileRow {
  user_id: string;
  skin_tone: string | null;
  eye_color: string | null;
  hair_color: string | null;
  chest_measurement_cm: number | null;
  waist_measurement_cm: number | null;
  hip_measurement_cm: number | null;
  colorimetry: Colorimetry | null;
  morphology: Morphology | null;
  preferred_fit: PreferredFit | null;
  lifestyle: Lifestyle | null;
  extra_preferences: Record<string, unknown> | null;
  created_at: string;
}

export function toProfile(row: ProfileRow): UserProfile {
  return {
    userId: row.user_id,
    skinTone: row.skin_tone,
    eyeColor: row.eye_color,
    hairColor: row.hair_color,
    chestMeasurementCm: row.chest_measurement_cm,
    waistMeasurementCm: row.waist_measurement_cm,
    hipMeasurementCm: row.hip_measurement_cm,
    colorimetry: row.colorimetry,
    morphology: row.morphology,
    preferredFit: row.preferred_fit,
    lifestyle: row.lifestyle,
    extraPreferences: row.extra_preferences ?? {},
    createdAt: row.created_at,
  };
}
