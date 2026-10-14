// Shared prompt types (system + user builders).
// Transport-agnostic: no Groq SDK, no route logic here.

import type { Garment, GarmentColor, GarmentType } from "@/types/garment";
import type { UserProfile } from "@/types/user";
import type { WeatherInfo } from "@/types/weather";

// Structural profile accepted by the prompt builders. A full UserProfile is
// assignable; the API layer may pass the minimized recommender profile
// (colorimetry, morphology, preferredFit, lifestyle) instead.
export interface StylistProfile {
  colorimetry: string | null;
  morphology: string | null;
  preferredFit: string | null;
  lifestyle: string | null;
  skinTone?: string | null;
  eyeColor?: string | null;
  hairColor?: string | null;
}

export type PromptProfile = UserProfile | StylistProfile | null;

// Looser than WeatherInfo: only the temperature is mandatory.
export type ClimateInput = Pick<WeatherInfo, "temperatureC"> &
  Partial<
    Pick<WeatherInfo, "condition" | "dayLow" | "dayHigh" | "rainProbability">
  >;

// Minimized locked garment for the prompt. A summary (not the full Garment)
// keeps unvalidated request payloads out of the prompt and the token count
// low. Full Garment objects remain assignable where they are available.
export interface LockedGarmentSummary {
  id: string;
  garmentType: GarmentType | null;
  color: GarmentColor | null;
}

export function toLockedSummary(garment: Garment): LockedGarmentSummary {
  return {
    id: garment.garmentId,
    garmentType: garment.garmentType,
    color: garment.color,
  };
}