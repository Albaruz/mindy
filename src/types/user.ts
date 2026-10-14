// User profile types mirroring the public.profiles table.
// Database uses snake_case; TypeScript uses camelCase properties.

import type {
  ColorimetryValue,
  LifestyleValue,
  MorphologyValue,
  PreferredFitValue,
} from "@/constants/profile";

// Unions are derived from the constants arrays (single source of truth).
export type Colorimetry = ColorimetryValue;
export type Morphology = MorphologyValue;
export type PreferredFit = PreferredFitValue;
export type Lifestyle = LifestyleValue;

export interface UserProfile {
  userId: string;
  skinTone: string | null;
  eyeColor: string | null;
  hairColor: string | null;
  chestMeasurementCm: number | null;
  waistMeasurementCm: number | null;
  hipMeasurementCm: number | null;
  colorimetry: Colorimetry | null;
  morphology: Morphology | null;
  preferredFit: PreferredFit | null;
  lifestyle: Lifestyle | null;
  extraPreferences: Record<string, unknown>;
  createdAt: string;
}

