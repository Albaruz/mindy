import { describe, expect, it } from "vitest";
import { completeOutfitOptions } from "./outfitCompletion";
import type { CandidateGarment, OutfitOption } from "./types";

function candidate(id: string, garmentType: string): CandidateGarment {
  return {
    id,
    garmentType: garmentType as CandidateGarment["garmentType"],
    color: "black",
    colorBase: null,
    material: "cotton",
    materialDetail: null,
    typeDetail: null,
    season: "all",
    style: "casual",
    styles: ["casual"],
    isDirty: false,
  };
}

const candidates = [
  candidate("top-1", "top"),
  candidate("top-2", "top"),
  candidate("top-3", "top"),
  candidate("bottom-1", "bottom"),
  candidate("bottom-2", "bottom"),
  candidate("bottom-3", "bottom"),
  candidate("shoes", "footwear"),
];

const firstOption: OutfitOption = {
  garmentIds: ["top-1", "bottom-1"],
  suitabilityRatio: 90,
  reason: "A first styled option.",
};

describe("completeOutfitOptions", () => {
  it("fills to three looks with distinct tops and bottoms when available", () => {
    const result = completeOutfitOptions(
      [firstOption],
      candidates,
      new Set(),
      false,
    );

    expect(result).toHaveLength(3);
    expect(result.map((option) => option.garmentIds.find((id) => id.startsWith("top-")))).toEqual([
      "top-1",
      "top-2",
      "top-3",
    ]);
    expect(result.map((option) => option.garmentIds.find((id) => id.startsWith("bottom-")))).toEqual([
      "bottom-1",
      "bottom-2",
      "bottom-3",
    ]);
  });

  it("returns fewer than three only when available garments cannot vary enough", () => {
    const result = completeOutfitOptions(
      [firstOption],
      [candidate("top-1", "top"), candidate("bottom-1", "bottom")],
      new Set(),
      false,
    );

    expect(result).toHaveLength(1);
  });

  it("uses warm alternatives instead of inventing a summer combination in cold weather", () => {
    const coldCandidates = [
      candidate("summer-top", "top"),
      candidate("summer-bottom", "bottom"),
      candidate("warm-top", "top"),
      candidate("warm-bottom", "bottom"),
      candidate("cardigan", "mid_layer"),
    ].map((item) =>
      item.id === "summer-top" || item.id === "summer-bottom"
        ? { ...item, season: "summer" as CandidateGarment["season"] }
        : item,
    );
    const result = completeOutfitOptions(
      [],
      coldCandidates,
      new Set(),
      false,
      true,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.garmentIds).toContain("warm-top");
    expect(result[0]?.garmentIds).not.toContain("summer-bottom");
    expect(result[0]?.garmentIds).not.toContain("summer-top");
  });
});
