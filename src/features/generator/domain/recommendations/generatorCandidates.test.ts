import { describe, expect, it } from "vitest";
import type { Garment } from "@/types/garment";
import { buildCandidates } from "./generatorCandidates";

function garment(garmentId: string, isDirty: boolean): Garment {
  return {
    garmentId,
    userId: "user-1",
    imageUrl: null,
    garmentType: "top",
    style: "casual",
    cutLength: null,
    styles: ["casual"],
    cuts: [],
    color: "black",
    material: "cotton",
    season: "all",
    isDirty,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    isFavorite: true,
  };
}

describe("buildCandidates", () => {
  it("keeps locked garments even when dirty or dismissed", () => {
    const lockedGarment = garment("locked-top", true);

    const candidates = buildCandidates(
      [lockedGarment],
      new Set(["locked-top"]),
      new Set(["locked-top"]),
    );

    expect(candidates).toEqual([lockedGarment]);
  });

  it("does not keep a dirty favorite just because it was selected", () => {
    const selectedFavorite = garment("favorite-top", true);
    const dismissedGarment = garment("dismissed-top", false);

    const candidates = buildCandidates(
      [selectedFavorite, dismissedGarment],
      new Set(),
      new Set(["favorite-top", "dismissed-top"]),
      new Set(["favorite-top"]),
    );

    expect(candidates).toEqual([]);
  });
});
