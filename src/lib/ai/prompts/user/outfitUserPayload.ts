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
  // Rain-safe material mandate echoed for the model (#BKL-001).
  // Optional so older callers keep compiling; defaults to false.
  requireRainSafeMaterials?: boolean;
  // Raw profile object echoed for the model (may be null on anonymous
  // or corrupt input); the structured summary lives in the system prompt.
  profile: unknown;
  mood: string | null;
  style: string | null;
  lockedGarmentIds: string[];
  // Minimized candidate list owned by the route (id + closed tags only).
  candidates: unknown[];
  // Active app locale echoed for the model (redundant with the system
  // prompt rule, but keeps the language intent next to the data).
  locale?: string;
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
    requireRainSafeMaterials: input.requireRainSafeMaterials ?? false,
    profile: typeof input.profile === "object" ? input.profile : null,
    mood: input.mood,
    style: input.style,
    lockedGarmentIds: [...input.lockedGarmentIds],
    candidates: input.candidates,
    language: input.locale ?? "en",
  };
}

export interface BuildOutfitPromptInput {
  profile: PromptProfile;
  climate: ClimateInput;
  lockedGarments: LockedGarmentSummary[];
  styleFilter: string | null;
  requireOuterwear: boolean;
  // Rain-safe material mandate (#BKL-001): set on wet days so the model
  // avoids silk/suede leftovers (user-locked pins). Defaults to false.
  requireRainSafeMaterials?: boolean;
  // Active app locale ("en" | "es"): only localizes the "reason" text,
  // JSON keys stay in English. Defaults to "en" when omitted.
  locale?: string;
  payload: OutfitUserPayloadInput;
}