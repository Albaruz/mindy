// Prompt versions. Bump the matching constant when a system prompt
// changes semantically; keep old builders around for A/B comparison.

/** Outfit stylist system prompt version. */
export const OUTFIT_STYLIST_PROMPT_VERSION = "1.1.0" as const;

/** Garment analysis system prompt version. */
export const GARMENT_ANALYSIS_PROMPT_VERSION = "2.1.0" as const;

export type PromptVersion =
  | typeof OUTFIT_STYLIST_PROMPT_VERSION
  | typeof GARMENT_ANALYSIS_PROMPT_VERSION;
