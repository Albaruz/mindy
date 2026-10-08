import type {
  Colorimetry,
  Lifestyle,
  Morphology,
  PreferredFit,
} from "@/types/user";
import type {
  FitChoice,
  JewelryPick,
  StyleTribe,
} from "./onboardingStore";
import {
  inferColorimetry,
  inferMorphology,
  mapStyleToLifestyle,
  mapFitToPreferredFit,
} from "@/constants/profile";

// Pure mapping from indirect wizard answers to the profiles contract.
// Morphology thresholds mirror inferProfile so both paths agree.
// Re-exported from centralized constants for backward compatibility.

export {
  inferColorimetry,
  inferMorphology,
  mapStyleToLifestyle,
  mapFitToPreferredFit,
};

export interface WizardPayload {
  displayName: string;
  skinTone: string;
  eyeColor: string;
  chestMeasurementCm: number;
  waistMeasurementCm: number;
  hipMeasurementCm: number;
  colorimetry: Colorimetry;
  morphology: Morphology;
  preferredFit: PreferredFit;
  lifestyle: Lifestyle;
  extraPreferences: {
    displayName: string;
    section: string;
    style: string;
    thermostat: number;
    forbiddenColors: string[];
  };
}

export interface WizardAnswers {
  displayName: string;
  section: string;
  style: StyleTribe;
  skinTone: string;
  eyeColor: string;
  chestCm: number;
  waistCm: number;
  hipCm: number;
  fit: FitChoice;
  jewelry: JewelryPick;
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
    lifestyle: mapStyleToLifestyle(answers.style),
    extraPreferences: {
      displayName: answers.displayName.trim(),
      section: answers.section,
      style: answers.style,
      thermostat: Math.round(answers.thermal),
      forbiddenColors: [...answers.forbiddenColors],
    },
  };
}
