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
    extraTags: { specificType: "pantalon" },
    createdAt: "",
    ...overrides,
  };
}

describe("matchesGarmentSearch", () => {
  it("matches empty query against everything", () => {
    expect(matchesGarmentSearch(buildGarment(), "")).toBe(true);
  });

  it("matches spanish query against english fields", () => {
    expect(matchesGarmentSearch(buildGarment(), "pantalon")).toBe(true);
    expect(matchesGarmentSearch(buildGarment(), "vaqueros")).toBe(true);
  });

  it("requires every concept to match", () => {
    expect(matchesGarmentSearch(buildGarment(), "pantalon lino")).toBe(false);
    expect(matchesGarmentSearch(buildGarment(), "pantalon denim")).toBe(true);
  });

  it("is accent-insensitive", () => {
    expect(matchesGarmentSearch(buildGarment(), "pantalón")).toBe(true);
  });
});

describe("filterGarmentsBySearch", () => {
  it("returns all garments on empty query", () => {
    const garments = [buildGarment()];
    expect(filterGarmentsBySearch(garments, "")).toBe(garments);
  });
});

describe("matchesGarmentCategory", () => {
  it("maps chips to generator slots", () => {
    expect(matchesGarmentCategory(buildGarment(), "all")).toBe(true);
    expect(matchesGarmentCategory(buildGarment(), "bottoms")).toBe(true);
    expect(matchesGarmentCategory(buildGarment(), "tops")).toBe(false);
  });
});

describe("filterGarmentsByCategory", () => {
  it("filters by chip", () => {
    const garments = [
      buildGarment({ garmentId: "a", garmentType: "top" }),
      buildGarment({ garmentId: "b", garmentType: "bottom" }),
    ];
    expect(filterGarmentsByCategory(garments, "tops")).toHaveLength(1);
  });
});
