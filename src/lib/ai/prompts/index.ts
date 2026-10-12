// Prompt builders entry point. Orchestrates versioned system prompts +
// dynamic user payloads; the engine only transports the result.

import { buildOutfitSystemPrompt } from "./system/outfitStylist.v1";
import { buildAnalysisSystemPromptV2 } from "./system/garmentAnalysis.v2";
import {
  buildOutfitUserPayload,
  type BuildOutfitPromptInput,
} from "./user/outfitUserPayload";
import {
  GARMENT_ANALYSIS_PROMPT_VERSION,
  OUTFIT_STYLIST_PROMPT_VERSION,
  type PromptVersion,
} from "./versions";

export interface BuiltOutfitPrompt {
  version: PromptVersion;
  systemPrompt: string;
  userPayload: Record<string, unknown>;
}

// Single outfit-generation prompt: versioned system instructions plus
// the per-request user payload.
export function buildOutfitPrompt(input: BuildOutfitPromptInput): BuiltOutfitPrompt {
  return {
    version: OUTFIT_STYLIST_PROMPT_VERSION,
    systemPrompt: buildOutfitSystemPrompt(
      input.profile,
      input.climate,
      input.lockedGarments,
      input.styleFilter,
      input.requireOuterwear,
      input.locale ?? "en",
    ),
    userPayload: buildOutfitUserPayload(input.payload),
  };
}

// Single garment-analysis prompt (vision): tags, a garment-only description,
// and cutout assessment from the original image.
export function buildAnalysisPrompt(locale: "en" | "es" = "en"): {
  version: PromptVersion;
  systemPrompt: string;
} {
  return {
    version: GARMENT_ANALYSIS_PROMPT_VERSION,
    systemPrompt: buildAnalysisSystemPromptV2(locale),
  };
}

export { buildOutfitSystemPrompt } from "./system/outfitStylist.v1";
export { buildAnalysisSystemPrompt } from "./system/garmentAnalysis.v1";
export { buildAnalysisSystemPromptV2 } from "./system/garmentAnalysis.v2";
export { buildOutfitUserPayload } from "./user/outfitUserPayload";
export type {
  BuildOutfitPromptInput,
  OutfitUserPayloadInput,
} from "./user/outfitUserPayload";
export type {
  ClimateInput,
  LockedGarmentSummary,
  PromptProfile,
  StylistProfile,
} from "./types";
export { toLockedSummary } from "./types";
export {
  GARMENT_ANALYSIS_PROMPT_VERSION,
  OUTFIT_STYLIST_PROMPT_VERSION,
  type PromptVersion,
} from "./versions";

// Backward compatibility: the pre-split builder name.
export { buildOutfitSystemPrompt as buildSystemPrompt } from "./system/outfitStylist.v1";
