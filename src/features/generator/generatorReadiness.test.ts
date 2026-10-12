import { describe, expect, it } from "vitest";
import type { Garment } from "@/types/garment";
import { getGeneratorReadiness } from "./generatorReadiness";

function garment(
  garmentId: string,
  garmentType: Garment["garmentType"],
  isDirty = false,
): Garment {
  return {
    garmentId,
    userId: "user-1",
    imageUrl: null,
    garmentType,
    style: "casual",
    cutLength: null,
    color: "black",
    material: "cotton",
    season: "all",
    isDirty,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "",
  };
}

describe("getGeneratorReadiness", () => {
  it("asks for clothes when the closet is empty", () => {
    expect(getGeneratorReadiness([])).toEqual({ status: "empty" });
  });

  it("requires each core category", () => {
    expect(getGeneratorReadiness([garment("top", "top")])).toEqual({
      status: "missing",
      categories: ["bottom", "footwear"],
    });
  });

  it("allows a dress to cover both top and bottom", () => {
    expect(
      getGeneratorReadiness([
        garment("dress", "dress"),
        garment("shoes", "footwear"),
      ]),
    ).toEqual({ status: "ready" });
  });

  it("requires laundry when dirty clothes are the only option for a category", () => {
    expect(
      getGeneratorReadiness([
        garment("top", "top", true),
        garment("bottom", "bottom", true),
        garment("shoes", "footwear"),
      ]),
    ).toEqual({ status: "laundry" });
  });

  it("offers laundry first when every wearable garment is dirty", () => {
    expect(
      getGeneratorReadiness([
        garment("top", "top", true),
        garment("shoes", "footwear"),
      ]),
    ).toEqual({ status: "laundry" });
  });

  it("stays blocked for missing categories even if existing clothes are dirty", () => {
    expect(
      getGeneratorReadiness([
        garment("top", "top"),
        garment("bottom", "bottom", true),
      ]),
    ).toEqual({ status: "missing", categories: ["footwear"] });
  });

  it("does not require outerwear", () => {
    expect(
      getGeneratorReadiness([
        garment("top", "top"),
        garment("bottom", "bottom"),
        garment("shoes", "footwear"),
      ]),
    ).toEqual({ status: "ready" });
  });
});
