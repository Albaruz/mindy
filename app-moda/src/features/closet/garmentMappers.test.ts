import { describe, expect, it } from "vitest";
import { toGarment, type GarmentRow } from "./garmentMappers";

function buildRow(overrides: Partial<GarmentRow> = {}): GarmentRow {
  return {
    garment_id: "g1",
    user_id: "u1",
    image_url: null,
    garment_type: "top",
    style: "casual",
    cut_length: null,
    color: "black",
    material: "cotton",
    season: "all",
    is_dirty: false,
    last_worn_date: null,
    is_external_garment: false,
    extra_tags: null,
    created_at: "2026-01-01",
    ...overrides,
  };
}

describe("toGarment", () => {
  it("maps snake_case row to camelCase garment", () => {
    const result = toGarment(buildRow({ garment_id: "abc", is_dirty: true }));
    expect(result.garmentId).toBe("abc");
    expect(result.isDirty).toBe(true);
    expect(result.extraTags).toEqual({});
  });

  it("preserves extra tags object", () => {
    const result = toGarment(
      buildRow({ extra_tags: { color_base: "rojo" } }),
    );
    expect(result.extraTags).toEqual({ color_base: "rojo" });
  });
});
