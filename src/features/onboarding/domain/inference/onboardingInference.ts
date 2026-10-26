import type { SaveProfileInput } from "@/constants/profileValidation";
import type { FitChoice, JewelryPick, StyleTribe } from "@/constants/ui-config";
import {
  inferColorimetry,
  inferMorphology,
  mapFitToPreferredFit,
} from "@/constants/profile";
import type { Lifestyle } from "@/types/user";

// Packs wizard answers into the profiles contract. Only colorimetry,
// morphology and fit are inferred; lifestyle is selected directly.
// Morphology thresholds mirror inferProfile so both paths agree.
// Re-exported from centralized constants for backward compatibility.

export {
  inferColorimetry,
  inferMorphology,
  mapFitToPreferredFit,
};

export interface WizardPayload extends SaveProfileInput {
  displayName: string;
}

export interface WizardAnswers {
  displayName: string;
  section: string;
  style: StyleTribe;
  lifestyle: Lifestyle;
  skinTone: string;
  eyeColor: string;
  chestCm: number;
  waistCm: number;
  hipCm: number;
  fit: FitChoice;
  jewelry: JewelryPick | "";
  thermal: number;
  forbiddenColors: string[];
}

// Packs validated client answers into the server action input shape.
export function buildWizardPayload(answers: WizardAnswers): WizardPayload {
  return {
    displayName: answers.displayName.trim(),
    skinTone: answers.skinTone,
    eyeColor: answers.eyeColor,
    chestMeasurementCm: Math.round(answers.chestCm),
    waistMeasurementCm: Math.round(answers.waistCm),
    hipMeasurementCm: Math.round(answers.hipCm),
    colorimetry: inferColorimetry(answers.skinTone, answers.jewelry),
    morphology: inferMorphology(
      answers.chestCm,
      answers.waistCm,
      answers.hipCm,
    ),
    preferredFit: mapFitToPreferredFit(answers.fit),
    lifestyle: answers.lifestyle,
    extraPreferences: {
      displayName: answers.displayName.trim(),
      section: answers.section,
      style: answers.style,
      jewelry: answers.jewelry,
      thermostat: Math.round(answers.thermal),
      forbiddenColors: [...answers.forbiddenColors],
    },
  };
}
