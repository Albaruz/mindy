import { describe, expect, it } from "vitest";
import { buildWizardPayload, type WizardAnswers } from "./onboardingInference";

function buildAnswers(overrides: Partial<WizardAnswers> = {}): WizardAnswers {
  return {
    displayName: "  Ada  ",
    section: "women",
    style: "minimalist",
    lifestyle: "corporate_office",
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

  it("infers colorimetry but preserves the independently selected lifestyle", () => {
    const payload = buildWizardPayload(buildAnswers());
    expect(payload.colorimetry).toBe("autumn");
    expect(payload.lifestyle).toBe("corporate_office");
    expect(payload.preferredFit).toBe("regular");
  });

  it("infers winter colorimetry when jewelry is skipped", () => {
    const payload = buildWizardPayload(buildAnswers({ jewelry: "" }));
    expect(payload.colorimetry).toBe("winter");
    expect(payload.extraPreferences.jewelry).toBe("");
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
