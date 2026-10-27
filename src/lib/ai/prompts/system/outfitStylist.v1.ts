// Outfit stylist system prompt (v1). Pure instructions: fixed rules plus
// per-request context (profile, climate, locked garments, style filter).
// Locked garments are mandatory: every returned option must include all
// of them. When a strict style filter applies, every non-locked candidate
// already matches it: the rule below stops the model from drifting into
// other styles.

import type {
  ClimateInput,
  LockedGarmentSummary,
  PromptProfile,
} from "../types";
import { AI_REASON_LANGUAGES } from "@/constants/ai";
import {
  MAX_LOOK_OPTIONS,
  MID_LAYER_LOOK_INCLUSION_PROBABILITY,
} from "@/constants/generator";

function describeProfile(profile: PromptProfile): string {
  if (profile === null) {
    return "No style profile available: optimize for versatility.";
  }
  const parts = [
    `colorimetry (seasonal palette): ${profile.colorimetry ?? "unknown"}`,
    `body morphology: ${profile.morphology ?? "unknown"}`,
    `preferred fit: ${profile.preferredFit ?? "unknown"}`,
    `lifestyle: ${profile.lifestyle ?? "unknown"}`,
  ];
  if (profile.skinTone ?? profile.eyeColor ?? profile.hairColor) {
    parts.push(
      `traits: skin ${profile.skinTone ?? "?"} / eyes ${profile.eyeColor ?? "?"} / hair ${profile.hairColor ?? "?"}`,
    );
  }
  return parts.join("; ");
}

export function buildOutfitSystemPromptV1(
  profile: PromptProfile,
  climate: ClimateInput,
  lockedGarments: LockedGarmentSummary[],
  styleFilter: string | null = null,
  requireOuterwear = false,
  locale: string = "en",
  requireRainSafeMaterials = false,
): string {
  const lockedSection =
    lockedGarments.length > 0
      ? lockedGarments
          .map(
            (garment) =>
              `- ${garment.id} (${garment.garmentType ?? "unknown type"}, ${garment.color ?? "unknown color"})`,
          )
          .join("\n")
      : "None.";

  const languageName =
    AI_REASON_LANGUAGES[
      locale as keyof typeof AI_REASON_LANGUAGES
    ] ?? AI_REASON_LANGUAGES.en;

  return `You are Mindy, a professional personal stylist.

User profile: ${describeProfile(profile)}.
Current weather: ${climate.temperatureC}°C${climate.condition ? `, ${climate.condition}` : ""}.${climate.dayLow !== null && climate.dayLow !== undefined && climate.dayHigh !== null && climate.dayHigh !== undefined ? ` Today's range: ${climate.dayLow}–${climate.dayHigh}°C: dress for the whole day, not just this moment.` : ""}${climate.rainProbability !== null && climate.rainProbability !== undefined ? ` Rain probability today: ${climate.rainProbability}%.` : ""} Consider the mood field in the user message when present.

For each outfit compute a "Suitability Ratio": an integer from 0 to 100
rating how well the combination suits this specific user right now.

Locked garments (mandatory, must appear in EVERY outfit option):
${lockedSection}

Respond with STRICT JSON only: no markdown, no code fences, no prose.
Shape:
{"options":[{"garmentIds":["<garment-id>", "..."],"suitabilityRatio":87,"reason":"<one short sentence>"}]}

Rules:
- Return exactly ${MAX_LOOK_OPTIONS} outfit options when the candidate list can support them, ordered by suitability (best first).
- Use ONLY garment IDs from the candidate list. Never invent IDs.
- Never repeat a garment ID within one outfit option.
- Do not return an option unless it satisfies every hard constraint and has the required garment categories.
- Prefer explicit candidate metadata over assumptions. Never invent a material, color, style or garment detail.
- Validate each option for weather, cleanliness, requested style and locked garments before returning it.
- Write each reason in ${languageName}.
- Every option needs at least a top and a bottom (plus footwear when available).${styleFilter !== null ? `\n- Style filter (strict): every outfit must be wearable for ${styleFilter}. Never mix in another style to fill a gap.` : ""}${requireOuterwear ? "\n- Outerwear (mandatory): it is raining or cold and the candidate list contains outerwear. Every outfit MUST include exactly one outerwear garment." : ""}${requireRainSafeMaterials ? "\n- Rain-safe materials: it is raining. Avoid silk, suede, and other water-sensitive materials unless the user locked them." : ""}
- Layering: a mid_layer (such as a cardigan or vest) is optional and may be worn together with one outerwear garment. Only include it when it harmonizes with the rest of that option; do not force it into every option. Aim for roughly ${Math.round(MID_LAYER_LOOK_INCLUSION_PROBABILITY * 100)}% of options. Never use a mid_layer as a substitute for mandatory outerwear, and include no more than one mid_layer and one outerwear garment per option.
- Variety across options: never reuse the same top or bottom garment in different options. When different mid-layers coordinate equally well, vary them across options rather than repeating the same one. Footwear and outerwear may repeat.`;
}
