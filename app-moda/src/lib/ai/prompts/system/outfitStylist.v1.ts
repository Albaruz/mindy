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

export function buildOutfitSystemPrompt(
  profile: PromptProfile,
  climate: ClimateInput,
  lockedGarments: LockedGarmentSummary[],
  styleFilter: string | null = null,
  requireOuterwear = false,
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
- Return 2 or 3 outfit options, ordered by suitability (best first).
- Use ONLY garment IDs from the candidate list. Never invent IDs.
- Every option needs at least a top and a bottom (plus footwear when available).${styleFilter !== null ? `\n- Style filter (strict): every outfit must be wearable for ${styleFilter}. Never mix in another style to fill a gap.` : ""}${requireOuterwear ? "\n- Outerwear (mandatory): it is raining or cold and the candidate list contains outerwear. Every outfit MUST include exactly one outerwear garment." : ""}
- Keep "reason" to one short sentence per option.`;
}