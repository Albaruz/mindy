import { describe, expect, it } from "vitest";
import { filterColdWeatherOutfitOptions } from "./weatherRules";
import type { CandidateGarment, OutfitOption } from "./types";

function candidate(
  id: string,
  garmentType: string,
  season: string,
  material = "cotton",
): CandidateGarment {
  return {
    id,
    garmentType: garmentType as CandidateGarment["garmentType"],
    color: "black",
    colorBase: null,
    material: material as CandidateGarment["material"],
    materialDetail: null,
    typeDetail: null,
    season: season as CandidateGarment["season"],
    style: "casual",
    styles: ["casual"],
    isDirty: false,
  };
}

function option(garmentIds: string[]): OutfitOption {
  return { garmentIds, suitabilityRatio: 80, reason: "A suitable outfit." };
}

describe("filterColdWeatherOutfitOptions", () => {
  const candidates = [
    candidate("summer-top", "top", "summer"),
    candidate("summer-bottom", "bottom", "summer"),
    candidate("warm-top", "top", "winter", "wool"),
    candidate("warm-bottom", "bottom", "all"),
    candidate("cardigan", "mid_layer", "all"),
  ];

  it("requires a mid-layer with unlocked summer tops", () => {
    const options = [
      option(["summer-top", "warm-bottom"]),
      option(["summer-top", "warm-bottom", "cardigan"]),
      option(["warm-top", "warm-bottom"]),
    ];

    expect(
      filterColdWeatherOutfitOptions(options, candidates, new Set(), true),
    ).toEqual([options[1], options[2]]);
  });

  it("rejects summer bottoms unless the garment is explicitly locked", () => {
    const summerBottom = option(["warm-top", "summer-bottom"]);

    expect(
      filterColdWeatherOutfitOptions(
        [summerBottom],
        candidates,
        new Set(),
        true,
      ),
    ).toEqual([]);
    expect(
      filterColdWeatherOutfitOptions(
        [summerBottom],
        candidates,
        new Set(["summer-bottom"]),
        true,
      ),
    ).toEqual([summerBottom]);
  });

  it("does not apply the cold-season restrictions in mild weather", () => {
    const summerLook = option(["summer-top", "summer-bottom"]);

    expect(
      filterColdWeatherOutfitOptions(
        [summerLook],
        candidates,
        new Set(),
        false,
      ),
    ).toEqual([summerLook]);
  });
});
