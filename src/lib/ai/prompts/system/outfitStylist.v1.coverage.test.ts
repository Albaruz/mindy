import { describe, expect, it } from "vitest";
import { buildOutfitSystemPromptV1 } from "./outfitStylist.v1";
import type { ClimateInput } from "../types";

const baseClimate: ClimateInput = { temperatureC: 21 };

describe("buildOutfitSystemPromptV1 branch coverage", () => {
  it("lists personal traits when the profile includes them", () => {
    const prompt = buildOutfitSystemPromptV1(
      {
        colorimetry: null,
        morphology: null,
        preferredFit: null,
        lifestyle: null,
        skinTone: "medium",
        eyeColor: "brown",
        hairColor: null,
      },
      baseClimate,
      [],
      null,
      false,
    );
    expect(prompt).toContain("skin medium");
    expect(prompt).toContain("eyes brown");
    expect(prompt).toContain("unknown");
  });

  it("omits the traits section when the profile has none", () => {
    const prompt = buildOutfitSystemPromptV1(
      {
        colorimetry: "winter",
        morphology: "rectangle",
        preferredFit: "regular",
        lifestyle: "casual_daily",
      },
      baseClimate,
      [],
      null,
      false,
    );
    expect(prompt).not.toContain("traits:");
    expect(prompt).toContain("winter");
  });

  it("labels locked garments with unknown attributes", () => {
    const prompt = buildOutfitSystemPromptV1(
      null,
      baseClimate,
      [{ id: "g9", garmentType: null, color: null }],
      null,
      false,
    );
    expect(prompt).toContain("g9");
    expect(prompt).toContain("unknown type");
    expect(prompt).toContain("unknown color");
  });

  it("mentions only the day range when rain data is absent", () => {
    const prompt = buildOutfitSystemPromptV1(
      null,
      { temperatureC: 16, dayLow: 10, dayHigh: 18 },
      [],
      null,
      false,
    );
    expect(prompt).toContain("Today's range: 10–18°C");
    expect(prompt).not.toContain("Rain probability");
  });

  it("mentions only rain probability when the day range is partial", () => {
    const prompt = buildOutfitSystemPromptV1(
      null,
      { temperatureC: 16, dayLow: 10, rainProbability: 40 },
      [],
      null,
      false,
    );
    expect(prompt).not.toContain("Today's range");
    expect(prompt).toContain("Rain probability today: 40%");
  });
});
