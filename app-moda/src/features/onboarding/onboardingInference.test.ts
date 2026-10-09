import { describe, expect, it } from "vitest";
import { buildWizardPayload, type WizardAnswers } from "./onboardingInference";

function buildAnswers(overrides: Partial<WizardAnswers> = {}): WizardAnswers {
  return {
    displayName: "  Ada  ",
    section: "women",
    style: "minimalist",
    skinTone: "brown",
    eyeColor: "brown",
    chestCm: 90.4,
    waistCm: 70.6,
    hipCm: 90.2,
    fit: "regular",
    jewelry: "gold",
    thermal: 2.4,
    forbiddenColors: ["red"],
    ...overrides,
  };
}

describe("buildWizardPayload", () => {
  it("trims display name and rounds measurements", () => {
    const payload = buildWizardPayload(buildAnswers());
    expect(payload.displayName).toBe("Ada");
    expect(payload.chestMeasurementCm).toBe(90);
    expect(payload.extraPreferences.displayName).toBe("Ada");
    expect(payload.extraPreferences.thermostat).toBe(2);
  });

  it("infers autumn colorimetry and lifestyle for gold plus deep skin", () => {
    const payload = buildWizardPayload(buildAnswers());
    expect(payload.colorimetry).toBe("autumn");
    expect(payload.lifestyle).toBe("casual_daily");
    expect(payload.preferredFit).toBe("regular");
  });

  it("copies forbidden colors without mutation", () => {
    const answers = buildAnswers({ forbiddenColors: ["blue"] });
    const payload = buildWizardPayload(answers);
    expect(payload.extraPreferences.forbiddenColors).toEqual(["blue"]);
    expect(payload.extraPreferences.forbiddenColors).not.toBe(
      answers.forbiddenColors,
    );
  });
});
