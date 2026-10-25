import { describe, expect, it, vi } from "vitest";
import type { CandidateGarment, OutfitOption } from "./types";
import {
  applyFavoriteInclusionChance,
  selectSuggestedFavoriteIds,
} from "./favoriteInclusion";

function candidate(id: string, garmentType: string): CandidateGarment {
  return {
    id,
    garmentType: garmentType as CandidateGarment["garmentType"],
    color: "black",
    colorBase: null,
    material: "cotton",
    materialDetail: null,
    season: "all",
    style: "casual",
    styles: ["casual"],
    isDirty: false,
  };
}

const options: OutfitOption[] = [
  { garmentIds: ["top-1", "bottom-1"], suitabilityRatio: 90, reason: "First" },
  { garmentIds: ["top-2", "bottom-2"], suitabilityRatio: 80, reason: "Second" },
];

describe("suggested favorite inclusion", () => {
  it("selects one available favorite for each replaceable category group", () => {
    const selected = selectSuggestedFavoriteIds(
      [
        candidate("favorite-top-a", "top"),
        candidate("favorite-top-b", "top"),
        candidate("favorite-dress", "dress"),
        candidate("favorite-bottom", "bottom"),
        candidate("dirty-favorite", "footwear"),
      ].map((garment) =>
        garment.id === "dirty-favorite" ? { ...garment, isDirty: true } : garment,
      ),
      new Set([
        "favorite-top-a",
        "favorite-top-b",
        "favorite-dress",
        "favorite-bottom",
        "dirty-favorite",
        "unknown-id",
      ]),
      new Set(),
      () => 0,
    );

    expect(selected).toEqual(
      new Set(["favorite-top-a", "favorite-dress", "favorite-bottom"]),
    );
  });

  it("ignores requested IDs that are locked, dirty, or not classifiable", () => {
    const selected = selectSuggestedFavoriteIds(
      [
        candidate("locked-favorite", "top"),
        { ...candidate("dirty-favorite", "bottom"), isDirty: true },
        candidate("unknown-category", "unclassified"),
      ],
      new Set(["locked-favorite", "dirty-favorite", "unknown-category"]),
      new Set(["locked-favorite"]),
      () => 0,
    );

    expect(selected.size).toBe(0);
  });

  it("handles an empty compatibility group when randomness is unavailable", () => {
    const selected = selectSuggestedFavoriteIds(
      [candidate("favorite-top", "top")],
      new Set(["favorite-top"]),
      new Set(),
      () => Number.NaN,
    );

    expect(selected.size).toBe(0);
  });

  it("substitutes a compatible favorite only when the per-look chance succeeds", () => {
    const candidates = [
      candidate("top-1", "top"),
      candidate("top-2", "top"),
      candidate("favorite-top", "top"),
      candidate("bottom-1", "bottom"),
      candidate("bottom-2", "bottom"),
    ];
    const random = vi.fn(() => 0);

    const result = applyFavoriteInclusionChance(
      options,
      candidates,
      new Set(),
      new Set(["favorite-top"]),
      false,
      0.25,
      random,
    );

    expect(result[0]?.garmentIds).toContain("favorite-top");
    expect(result[0]?.garmentIds).not.toContain("top-1");
    // Tops cannot repeat between generated looks, so the same favorite is
    // not inserted into another option in the same response.
    expect(result[1]?.garmentIds).not.toContain("favorite-top");
  });

  it("leaves the options unchanged when the random roll misses", () => {
    const candidates = [
      candidate("top-1", "top"),
      candidate("bottom-1", "bottom"),
      candidate("favorite-top", "top"),
    ];

    const result = applyFavoriteInclusionChance(
      [options[0]!],
      candidates,
      new Set(),
      new Set(["favorite-top"]),
      false,
      0.25,
      () => 0.99,
    );

    expect(result[0]?.garmentIds).toEqual(["top-1", "bottom-1"]);
  });

  it("returns options unchanged when there are no options or no suggestions", () => {
    const candidates = [candidate("top-1", "top"), candidate("bottom-1", "bottom")];
    const source = [options[0]!];

    expect(
      applyFavoriteInclusionChance(source, candidates, new Set(), new Set(), false),
    ).toBe(source);
    expect(
      applyFavoriteInclusionChance([], candidates, new Set(), new Set(["favorite"]), false),
    ).toEqual([]);
  });

  it("keeps a favorite already present in the generated option", () => {
    const source = [
      {
        garmentIds: ["top-1", "favorite-top", "bottom-1"],
        suitabilityRatio: 90,
        reason: "",
      },
    ];
    const result = applyFavoriteInclusionChance(
      source,
      [
        candidate("top-1", "top"),
        candidate("favorite-top", "top"),
        candidate("bottom-1", "bottom"),
      ],
      new Set(),
      new Set(["favorite-top"]),
      false,
      0,
    );

    expect(result[0]?.garmentIds).toEqual(["favorite-top", "bottom-1"]);
  });

  it("leaves options alone when all suggested favorites were filtered out", () => {
    const source = [
      { garmentIds: ["top-1", "bottom-1"], suitabilityRatio: 90, reason: "" },
    ];
    const result = applyFavoriteInclusionChance(
      source,
      [
        candidate("top-1", "top"),
        candidate("bottom-1", "bottom"),
        { ...candidate("dirty-favorite", "top"), isDirty: true },
      ],
      new Set(),
      new Set(["dirty-favorite"]),
      false,
    );

    expect(result).toBe(source);
  });

  it("ignores unknown and unclassifiable garments in an option", () => {
    const source = [
      { garmentIds: ["unknown", "unclassified"], suitabilityRatio: 90, reason: "" },
    ];
    const result = applyFavoriteInclusionChance(
      source,
      [candidate("favorite-top", "top"), candidate("unclassified", "unclassified")],
      new Set(),
      new Set(["favorite-top"]),
      false,
      1,
      () => 0,
    );

    expect(result[0]?.garmentIds).toEqual(["unknown", "unclassified"]);
  });

  it("leaves the source option intact if an invalid option cannot accept a favorite", () => {
    const source = [
      { garmentIds: ["top-1", "bottom-1"], suitabilityRatio: 90, reason: "" },
    ];
    const result = applyFavoriteInclusionChance(
      source,
      [
        candidate("top-1", "top"),
        candidate("bottom-1", "bottom"),
        candidate("favorite-top", "top"),
      ],
      new Set(),
      new Set(["favorite-top"]),
      true,
      1,
      () => 0,
    );

    expect(result[0]?.garmentIds).toEqual(["top-1", "bottom-1"]);
  });

  it("returns the source option if the random source cannot select a replacement", () => {
    const source = [
      { garmentIds: ["top-1", "bottom-1"], suitabilityRatio: 90, reason: "" },
    ];
    let randomCalls = 0;
    const result = applyFavoriteInclusionChance(
      source,
      [
        candidate("top-1", "top"),
        candidate("bottom-1", "bottom"),
        candidate("favorite-top", "top"),
      ],
      new Set(),
      new Set(["favorite-top"]),
      false,
      1,
      () => (randomCalls++ === 0 ? 0 : Number.NaN),
    );

    expect(result[0]?.garmentIds).toEqual(["top-1", "bottom-1"]);
  });

  it("does not turn a separate outfit into a one-piece look", () => {
    const candidates = [
      candidate("top-1", "top"),
      candidate("bottom-1", "bottom"),
      candidate("favorite-dress", "dress"),
    ];
    const result = applyFavoriteInclusionChance(
      [{ garmentIds: ["top-1", "bottom-1"], suitabilityRatio: 80, reason: "" }],
      candidates,
      new Set(),
      new Set(["favorite-dress"]),
      false,
      1,
      () => 0,
    );

    expect(result[0]?.garmentIds).toEqual(["top-1", "bottom-1"]);
  });

  it("never replaces a locked garment with an optional favorite", () => {
    const result = applyFavoriteInclusionChance(
      [{ garmentIds: ["locked-top", "bottom-1"], suitabilityRatio: 80, reason: "" }],
      [
        candidate("locked-top", "top"),
        candidate("bottom-1", "bottom"),
        candidate("favorite-top", "top"),
      ],
      new Set(["locked-top"]),
      new Set(["favorite-top"]),
      false,
      1,
      () => 0,
    );

    expect(result[0]?.garmentIds).toEqual(["locked-top", "bottom-1"]);
  });

  it("can substitute a compatible optional outerwear item", () => {
    const result = applyFavoriteInclusionChance(
      [
        {
          garmentIds: ["top-1", "bottom-1", "coat-1"],
          suitabilityRatio: 80,
          reason: "",
        },
      ],
      [
        candidate("top-1", "top"),
        candidate("bottom-1", "bottom"),
        candidate("coat-1", "outerwear"),
        candidate("favorite-coat", "outerwear"),
      ],
      new Set(),
      new Set(["favorite-coat"]),
      true,
      1,
      () => 0,
    );

    expect(result[0]?.garmentIds).toContain("favorite-coat");
    expect(result[0]?.garmentIds).not.toContain("coat-1");
  });
});
