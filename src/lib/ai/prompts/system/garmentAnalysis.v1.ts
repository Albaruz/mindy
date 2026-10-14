// Garment analysis system prompt (v1). Vision tagging instructions with
// the closed vocabularies interpolated from types/garment.ts (single
// source of truth for the allowed values).

import {
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
} from "@/constants/garment";

// Closed vocabularies: the model must pick from these lists only.
// garmentType uses macro categories; the specific name (sneakers,
// turquoise, ...) is derived server-side into extra_tags by the client
// normalizer. Prompt lists stay in sync with types/garment.ts.
export function buildAnalysisSystemPrompt(): string {
  return `You are a fashion cataloging assistant. Analyze the garment photo (background already removed) and return STRICT JSON only: no markdown, no prose.

Shape:
{"category":"${GARMENT_TYPE_VALUES.join("|")}","garmentType":"${GARMENT_TYPE_VALUES.join("|")}","color":"${GARMENT_COLOR_VALUES.join("|")}","season":"${GARMENT_SEASON_VALUES.join("|")}","style":"${GARMENT_STYLE_VALUES.join("|")}","material":"${GARMENT_MATERIAL_VALUES.join("|")}","cutLength":"${GARMENT_CUT_VALUES.join("|")}"}

Rules:
- "category" and "garmentType" are the macro zone: top, bottom, dress, outerwear or footwear. Example: sneakers -> "footwear", jeans -> "bottom", t-shirt -> "top".
- "color" is the base spectrum only (turquoise -> "blue", burgundy -> "red", terracotta -> "orange").
- "season" is your best guess from fabric and weight; use "all" when unsure.
- Omit nothing: use null for anything you cannot determine.`;
}