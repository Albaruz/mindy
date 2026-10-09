import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt, buildOutfitPrompt } from "./prompts/index";

describe("buildOutfitPrompt", () => {
  it("builds versioned prompt with user payload", () => {
    const result = buildOutfitPrompt({
      profile: null,
      climate: {
        temperatureC: 20,
        condition: "Clear",
        dayLow: 15,
        dayHigh: 25,
        rainProbability: 10,
      },
      lockedGarments: [],
      styleFilter: null,
      requireOuterwear: false,
      payload: {
        temperatureC: 20,
        dayLow: 15,
        dayHigh: 25,
        rainProbability: 10,
        requireOuterwear: false,
        profile: null,
        mood: "relaxed",
        style: null,
        lockedGarmentIds: [],
        candidates: [],
      },
    });
    expect(result.version).toBeDefined();
    expect(result.systemPrompt.length).toBeGreaterThan(0);
    expect(result.userPayload.temperatureC).toBe(20);
  });
});

describe("buildAnalysisPrompt", () => {
  it("builds versioned vision prompt", () => {
    const result = buildAnalysisPrompt();
    expect(result.version).toBeDefined();
    expect(result.systemPrompt.length).toBeGreaterThan(0);
  });
});
