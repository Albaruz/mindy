import { describe, expect, it, vi } from "vitest";
import { applyMidLayerInclusionChance } from "./midLayerInclusion";
import type { CandidateGarment, OutfitOption } from "./types";

function candidate(
  id: string,
  garmentType: string,
  season: string = "all",
  material: string = "cotton",
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

const baseOption: OutfitOption = {
  garmentIds: ["top", "bottom"],
  suitabilityRatio: 80,
  reason: "A versatile outfit.",
};

const candidates = [
  candidate("top", "top"),
  candidate("bottom", "bottom"),
  candidate("cardigan", "mid_layer"),
];

describe("applyMidLayerInclusionChance", () => {
  it("keeps the stylist's mid-layer when the inclusion draw succeeds", () => {
    const result = applyMidLayerInclusionChance(
      [{ ...baseOption, garmentIds: [...baseOption.garmentIds, "cardigan"] }],
      candidates,
      new Set(),
      0.35,
      () => 0,
    );

    expect(result[0]?.garmentIds).toEqual(["top", "bottom", "cardigan"]);
  });

  it("does not add an unchosen layer even when the draw succeeds", () => {
    const result = applyMidLayerInclusionChance(
      [baseOption],
      candidates,
      new Set(),
      1,
      () => 0,
    );

    expect(result[0]?.garmentIds).toEqual(["top", "bottom"]);
  });

  it("removes an unpinned mid-layer when the inclusion draw misses", () => {
    const result = applyMidLayerInclusionChance(
      [{ ...baseOption, garmentIds: [...baseOption.garmentIds, "cardigan"] }],
      candidates,
      new Set(),
      0.35,
      () => 0.9,
    );

    expect(result[0]?.garmentIds).toEqual(["top", "bottom"]);
  });

  it("always keeps an explicitly locked mid-layer", () => {
    const random = vi.fn(() => 0.9);
    const result = applyMidLayerInclusionChance(
      [{ ...baseOption, garmentIds: [...baseOption.garmentIds, "cardigan"] }],
      candidates,
      new Set(["cardigan"]),
      0,
      random,
    );

    expect(result[0]?.garmentIds).toContain("cardigan");
    expect(random).not.toHaveBeenCalled();
  });

  it("does not repeat the same optional layer in every option", () => {
    const repeatedOption = {
      ...baseOption,
      garmentIds: [...baseOption.garmentIds, "cardigan"],
    };
    const result = applyMidLayerInclusionChance(
      [repeatedOption, repeatedOption, repeatedOption],
      candidates,
      new Set(),
      1,
      () => 0,
    );

    expect(result.filter((option) => option.garmentIds.includes("cardigan"))).toHaveLength(1);
  });

  it("retains chosen layers across cold-weather options", () => {
    const layeredOption = {
      ...baseOption,
      garmentIds: [...baseOption.garmentIds, "cardigan"],
    };
    const result = applyMidLayerInclusionChance(
      [layeredOption, layeredOption, layeredOption],
      candidates,
      new Set(),
      1,
      () => 0,
      true,
    );

    expect(result.every((option) => option.garmentIds.includes("cardigan"))).toBe(
      true,
    );
  });

  it("removes a redundant layer from a warm winter top", () => {
    const warmCandidates = [
      candidate("winter-top", "top", "winter"),
      candidate("wool-top", "top", "all", "wool"),
      candidate("bottom", "bottom"),
      candidate("cardigan", "mid_layer"),
    ];
    const result = applyMidLayerInclusionChance(
      [
        {
          garmentIds: ["winter-top", "bottom", "cardigan"],
          suitabilityRatio: 80,
          reason: "",
        },
        {
          garmentIds: ["wool-top", "bottom", "cardigan"],
          suitabilityRatio: 75,
          reason: "",
        },
      ],
      warmCandidates,
      new Set(),
      1,
      () => 0,
      true,
    );

    expect(result.map((option) => option.garmentIds)).toEqual([
      ["winter-top", "bottom"],
      ["wool-top", "bottom"],
    ]);
  });
});
