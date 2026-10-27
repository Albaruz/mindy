import { describe, expect, it } from "vitest";
import { generateFallbackLook } from "./fallback";
import type { CandidateGarment } from "./types";

function candidate(
  id: string,
  garmentType: string,
  season: string = "all",
): CandidateGarment {
  return {
    id,
    garmentType: garmentType as CandidateGarment["garmentType"],
    color: "black",
    colorBase: null,
    material: "cotton",
    materialDetail: null,
    typeDetail: null,
    season: season as CandidateGarment["season"],
    style: "casual",
    styles: ["casual"],
    isDirty: false,
  };
}

describe("generateFallbackLook", () => {
  it("can layer a mid-layer under outerwear on cold days", () => {
    const options = generateFallbackLook(
      [
        candidate("shirt", "top"),
        candidate("trousers", "bottom"),
        candidate("cardigan", "mid_layer"),
        candidate("coat", "outerwear"),
      ],
      new Set(),
      5,
      true,
    );

    expect(options).toHaveLength(1);
    expect(options[0]?.garmentIds).toEqual(
      expect.arrayContaining(["shirt", "trousers", "cardigan", "coat"]),
    );
  });

  it("uses a layer for summer tops and skips summer bottoms at 15 degrees", () => {
    const options = generateFallbackLook(
      [
        candidate("summer-shirt", "top", "summer"),
        candidate("summer-skirt", "bottom", "summer"),
        candidate("warm-trousers", "bottom", "mid_season"),
        candidate("cardigan", "mid_layer"),
        candidate("coat", "outerwear"),
      ],
      new Set(),
      15,
      true,
    );

    expect(options).toHaveLength(1);
    expect(options[0]?.garmentIds).toContain("cardigan");
    expect(options[0]?.garmentIds).toContain("warm-trousers");
    expect(options[0]?.garmentIds).not.toContain("summer-skirt");
  });

  it("does not add a redundant layer to a warm winter top", () => {
    const options = generateFallbackLook(
      [
        candidate("wool-sweater", "top", "winter"),
        candidate("trousers", "bottom"),
        candidate("cardigan", "mid_layer"),
        candidate("coat", "outerwear"),
      ],
      new Set(),
      15,
      true,
    );

    expect(options).toHaveLength(1);
    expect(options[0]?.garmentIds).not.toContain("cardigan");
    expect(options[0]?.garmentIds).toContain("coat");
  });
});
