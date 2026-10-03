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

// Pure mapping from indirect wizard answers to the profiles contract.
// Morphology thresholds mirror inferProfile so both paths agree.
export function inferMorphology(
  chestCm: number,
  waistCm: number,
  hipCm: number,
): Morphology {
  if (hipCm - chestCm > 3) {
    return "triangle";
  }
  if (chestCm - hipCm > 3) {
    return "inverted_triangle";
  }
  if (chestCm - waistCm > 12 && hipCm - waistCm > 12) {
    return "hourglass";
  }
  if (waistCm >= chestCm - 3 && waistCm >= hipCm - 3) {
    return "oval";
  }
  return "rectangle";
}

// Indirect colorimetry: gold points warm, silver points cool, refined by
// skin depth. Warm + deep = autumn, warm + fair = spring,
// cool + fair = summer, cool + deep = winter.
export function inferColorimetry(
  skinTone: string,
  jewelry: JewelryPick,
): Colorimetry {
  const deepSkin = ["medium", "olive", "brown", "deep"].includes(
    skinTone.toLowerCase(),
  );
  if (jewelry === "gold") {
    return deepSkin ? "autumn" : "spring";
  }
  return deepSkin ? "winter" : "summer";
}

export function mapStyleToLifestyle(style: StyleTribe): Lifestyle {
  switch (style) {
    case "minimalist":
      return "casual_daily";
    case "classic":
      return "corporate_office";
    case "streetwear":
      return "social_events";
    case "boho":
      return "home_remote";
  }
}

export function mapFitToPreferredFit(fit: FitChoice): PreferredFit {
  switch (fit) {
    case "fitted":
      return "slim";
    case "regular":
      return "regular";
    case "oversized":
      return "oversized";
  }
}

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
