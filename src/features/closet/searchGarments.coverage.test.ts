import { describe, expect, it } from "vitest";
import {
  filterGarmentsByCategory,
  filterGarmentsBySearch,
  matchesGarmentCategory,
  matchesGarmentSearch,
} from "./searchGarments";
import type { Garment } from "@/types/garment";

function buildGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    garmentId: "g1",
    userId: "u1",
    imageUrl: null,
    garmentType: "bottom",
    style: "casual",
    cutLength: null,
    color: "blue",
    material: "denim",
    season: "all",
    isDirty: false,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "",
    ...overrides,
  };
}

describe("matchesGarmentSearch token branches", () => {
  it("matches a plural query against a singular token", () => {
    expect(matchesGarmentSearch(buildGarment(), "denims")).toBe(true);
  });

  it("matches a singular query against a plural token", () => {
    const garment = buildGarment({
      extraTags: { specificType: "jeans" },
    });
    expect(matchesGarmentSearch(garment, "jean")).toBe(true);
  });

  it("matches es plurals on either side", () => {
    const garment = buildGarment({
      extraTags: { specificType: "dresses" },
    });
    expect(matchesGarmentSearch(garment, "dress")).toBe(true);
  });

  it("ignores hyphen joiners when comparing tokens", () => {
    const garment = buildGarment({
      extraTags: { specificType: "high-top" },
    });
    expect(matchesGarmentSearch(garment, "hightop")).toBe(true);
  });

  it("returns false when the garment has no searchable text", () => {
    const empty = buildGarment({
      garmentType: null,
      style: null,
      cutLength: null,
      color: null,
      material: null,
      season: "all",
      extraTags: {},
    });
    expect(matchesGarmentSearch(empty, "red")).toBe(false);
  });

  it("ignores non-string extra tag values", () => {
    const garment = buildGarment({
      extraTags: { wearCount: 3, nested: { deep: true } },
    });
    expect(matchesGarmentSearch(garment, "denim")).toBe(true);
    expect(matchesGarmentSearch(garment, "wearcount")).toBe(false);
  });

  it("matches the snake_case base color", () => {
    const garment = buildGarment({
      color: "blue",
      extraTags: { color_base: "red" },
    });
    expect(matchesGarmentSearch(garment, "red")).toBe(true);
  });

  it("matches the camelCase base color", () => {
    const garment = buildGarment({
      color: "blue",
      extraTags: { colorBase: "red" },
    });
    expect(matchesGarmentSearch(garment, "red")).toBe(true);
  });

  it("ignores a non-string base color", () => {
    const garment = buildGarment({
      color: "blue",
      extraTags: { color_base: 5 },
    });
    expect(matchesGarmentSearch(garment, "red")).toBe(false);
  });
});

describe("filterGarmentsBySearch branches", () => {
  it("filters down to matching garments on a non-empty query", () => {
    const garments = [
      buildGarment({ garmentId: "match", material: "denim" }),
      buildGarment({ garmentId: "other", material: "linen" }),
    ];
    const result = filterGarmentsBySearch(garments, "denim");
    expect(result.map((entry) => entry.garmentId)).toEqual(["match"]);
  });
});

describe("matchesGarmentCategory branches", () => {
  it("maps every chip to its slot", () => {
    expect(
      matchesGarmentCategory(buildGarment({ garmentType: "top" }), "all"),
    ).toBe(true);
    expect(
      matchesGarmentCategory(buildGarment({ garmentType: "top" }), "tops"),
    ).toBe(true);
    expect(
      matchesGarmentCategory(
        buildGarment({ garmentType: "footwear" }),
        "shoes",
      ),
    ).toBe(true);
    expect(
      matchesGarmentCategory(
        buildGarment({ garmentType: "outerwear" }),
        "outerwear",
      ),
    ).toBe(true);
    expect(
      matchesGarmentCategory(
        buildGarment({ garmentType: "footwear" }),
        "outerwear",
      ),
    ).toBe(false);
  });
});

describe("filterGarmentsByCategory branches", () => {
  it("returns the same array for all", () => {
    const garments = [buildGarment()];
    expect(filterGarmentsByCategory(garments, "all")).toBe(garments);
  });
});
