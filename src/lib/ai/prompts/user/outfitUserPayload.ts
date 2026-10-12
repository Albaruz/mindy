// Outfit user payload builder. Dynamic per-request data (climate,
// candidates, mood) kept separate from the fixed system instructions.

import type {
  ClimateInput,
  LockedGarmentSummary,
  PromptProfile,
} from "../types";

export interface OutfitUserPayloadInput {
  temperatureC: number;
  dayLow: number | null;
  dayHigh: number | null;
  rainProbability: number | null;
  requireOuterwear: boolean;
  // Raw profile object echoed for the model (may be null on anonymous
  // or corrupt input); the structured summary lives in the system prompt.
  profile: unknown;
  mood: string | null;
  style: string | null;
  lockedGarmentIds: string[];
  // Minimized candidate list owned by the route (id + closed tags only).
  candidates: unknown[];
}

export function buildOutfitUserPayload(
  input: OutfitUserPayloadInput,
): Record<string, unknown> {
  return {
    temperatureC: input.temperatureC,
    dayLow: input.dayLow,
    dayHigh: input.dayHigh,
    rainProbability: input.rainProbability,
    requireOuterwear: input.requireOuterwear,
    profile: typeof input.profile === "object" ? input.profile : null,
    mood: input.mood,
    style: input.style,
    lockedGarmentIds: [...input.lockedGarmentIds],
    candidates: input.candidates,
  };
}

export interface BuildOutfitPromptInput {
  profile: PromptProfile;
  climate: ClimateInput;
  lockedGarments: LockedGarmentSummary[];
  styleFilter: string | null;
  requireOuterwear: boolean;
  payload: OutfitUserPayloadInput;
}