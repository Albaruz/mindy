import { describe, expect, it } from "vitest";
import {
  categorizeGarment,
  categorizeGarments,
  isLaundryExemptGarment,
  isOnePieceGarment,
  withoutHiddenBottom,
} from "./categorizeGarments";
import type { Garment } from "@/types/garment";

function buildGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    garmentId: "branch-id",
    userId: "user-id",
    imageUrl: null,
    garmentType: "top",
    style: "casual",
    cutLength: null,
    color: "black",
    material: "cotton",
    season: "all",
    isDirty: false,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "",
    ...overrides,
  };
}

describe("categorizeGarment legacy branches", () => {
  it("normalizes a legacy alias through specificType to the closed base", () => {
    expect(
      categorizeGarment(
        buildGarment({
          garmentType: null,
          extraTags: { specificType: "shirt" },
        }),
      ),
    ).toBe("top");
  });

  it("prefers the stored aiCategory when no legacy base matches", () => {
    expect(
      categorizeGarment(
        buildGarment({
          garmentType: null,
          extraTags: { aiCategory: "bottom" },
        }),
      ),
    ).toBe("bottom");
  });

  it("ignores a non-string aiCategory and falls through", () => {
    expect(
      categorizeGarment(
        buildGarment({
          garmentType: null,
          extraTags: { aiCategory: 42 },
        }),
      ),
    ).toBeNull();
  });

  it("matches free-text keywords when normalization finds no base", () => {
    expect(
      categorizeGarment(
        buildGarment({
          garmentType: null,
          extraTags: { specificType: "vintage t-shirt" },
        }),
      ),
    ).toBe("top");
    expect(
      categorizeGarment(
        buildGarment({
          garmentType: null,
          extraTags: { specificType: "retro sneakers" },
        }),
      ),
    ).toBe("footwear");
  });

  it("returns null for free text without any keyword", () => {
    expect(
      categorizeGarment(
        buildGarment({
          garmentType: null,
          extraTags: { specificType: "mystery object" },
        }),
      ),
    ).toBeNull();
  });

  it("returns null for a non-string specificType", () => {
    expect(
      categorizeGarment(
        buildGarment({
          garmentType: null,
          extraTags: { specificType: 7 },
        }),
      ),
    ).toBeNull();
  });
});

describe("isOnePieceGarment branches", () => {
  it("detects gown through the legacy text path", () => {
    expect(
      isOnePieceGarment(
        buildGarment({ garmentType: null, extraTags: { specificType: "gown" } }),
      ),
    ).toBe(true);
  });

  it("returns false for empty legacy text", () => {
    expect(
      isOnePieceGarment(buildGarment({ garmentType: null, extraTags: {} })),
    ).toBe(false);
  });

  it("returns false for a non one-piece keyword", () => {
    expect(
      isOnePieceGarment(
        buildGarment({
          garmentType: null,
          extraTags: { specificType: "coat" },
        }),
      ),
    ).toBe(false);
  });
});

describe("isLaundryExemptGarment branches", () => {
  it("returns false for undefined and uncategorizable garments", () => {
    expect(isLaundryExemptGarment(undefined)).toBe(false);
    expect(
      isLaundryExemptGarment(
        buildGarment({ garmentType: null, extraTags: {} }),
      ),
    ).toBe(false);
  });
});

describe("withoutHiddenBottom branches", () => {
  it("drops bottoms when the one-piece arrives via legacy text", () => {
    const garments = [
      buildGarment({
        garmentId: "mono",
        garmentType: null,
        extraTags: { specificType: "jumpsuit" },
      }),
      buildGarment({ garmentId: "pants", garmentType: "bottom" }),
    ];
    expect(
      withoutHiddenBottom(garments).map((entry) => entry.garmentId),
    ).toEqual(["mono"]);
  });
});

describe("categorizeGarments grouping", () => {
  it("skips uncategorizable garments", () => {
    const grouped = categorizeGarments([
      buildGarment({ garmentId: "known", garmentType: "top" }),
      buildGarment({
        garmentId: "unknown",
        garmentType: null,
        extraTags: {},
      }),
    ]);
    expect(grouped.top.map((entry) => entry.garmentId)).toEqual(["known"]);
    expect(grouped.bottom).toHaveLength(0);
  });
});
