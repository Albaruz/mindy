// User profile types mirroring the public.profiles table.
// Database uses snake_case; TypeScript uses camelCase properties.

export type Colorimetry = "spring" | "summer" | "autumn" | "winter";

export type Morphology =
  | "triangle"
  | "inverted_triangle"
  | "hourglass"
  | "rectangle"
  | "oval";

export type PreferredFit = "slim" | "regular" | "oversized" | "mixed";

export type Lifestyle =
  | "casual_daily"
  | "corporate_office"
  | "active_sports"
  | "home_remote"
  | "social_events";

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
