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
    garmentId: "test-id",
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

describe("categorizeGarment", () => {
  it("maps closed types to categories", () => {
    expect(categorizeGarment(buildGarment({ garmentType: "top" }))).toBe(
      "top",
    );
    expect(categorizeGarment(buildGarment({ garmentType: "bottom" }))).toBe(
      "bottom",
    );
    expect(categorizeGarment(buildGarment({ garmentType: "footwear" }))).toBe(
      "footwear",
    );
    expect(categorizeGarment(buildGarment({ garmentType: "outerwear" }))).toBe(
      "outerwear",
    );
  });

  it("maps dress to top slot", () => {
    expect(categorizeGarment(buildGarment({ garmentType: "dress" }))).toBe(
      "top",
    );
  });

  it("returns null for unknown type without fallback data", () => {
    expect(
      categorizeGarment(buildGarment({ garmentType: null, extraTags: {} })),
    ).toBeNull();
  });

  it("maps legacy shoes aiCategory forward to footwear", () => {
    expect(
      categorizeGarment(
        buildGarment({ garmentType: null, extraTags: { aiCategory: "shoes" } }),
      ),
    ).toBe("footwear");
  });
});

describe("isOnePieceGarment", () => {
  it("detects dress and jumpsuit variants", () => {
    expect(isOnePieceGarment(buildGarment({ garmentType: "dress" }))).toBe(
      true,
    );
    expect(
      isOnePieceGarment(
        buildGarment({
          garmentType: null,
          extraTags: { specificType: "jumpsuit" },
        }),
      ),
    ).toBe(true);
  });

  it("rejects null and two-piece garments", () => {
    expect(isOnePieceGarment(null)).toBe(false);
    expect(isOnePieceGarment(undefined)).toBe(false);
    expect(isOnePieceGarment(buildGarment({ garmentType: "top" }))).toBe(
      false,
    );
  });
});

describe("isLaundryExemptGarment", () => {
  it("exempts footwear and outerwear only", () => {
    expect(
      isLaundryExemptGarment(buildGarment({ garmentType: "footwear" })),
    ).toBe(true);
    expect(
      isLaundryExemptGarment(buildGarment({ garmentType: "outerwear" })),
    ).toBe(true);
    expect(isLaundryExemptGarment(buildGarment({ garmentType: "top" }))).toBe(
      false,
    );
    expect(isLaundryExemptGarment(null)).toBe(false);
  });
});

describe("withoutHiddenBottom", () => {
  it("drops bottom garments when a one-piece is present", () => {
    const garments = [
      buildGarment({ garmentId: "dress", garmentType: "dress" }),
      buildGarment({ garmentId: "pants", garmentType: "bottom" }),
    ];
    const result = withoutHiddenBottom(garments);
    expect(result.map((entry) => entry.garmentId)).toEqual(["dress"]);
  });

  it("keeps all garments without one-piece", () => {
    const garments = [
      buildGarment({ garmentId: "top", garmentType: "top" }),
      buildGarment({ garmentId: "pants", garmentType: "bottom" }),
    ];
    expect(withoutHiddenBottom(garments)).toHaveLength(2);
  });
});

describe("categorizeGarments", () => {
  it("groups garments by category", () => {
    const grouped = categorizeGarments([
      buildGarment({ garmentId: "a", garmentType: "top" }),
      buildGarment({ garmentId: "b", garmentType: "bottom" }),
    ]);
    expect(grouped.top).toHaveLength(1);
    expect(grouped.bottom).toHaveLength(1);
    expect(grouped.footwear).toHaveLength(0);
  });
});
