import { describe, expect, it } from "vitest";
import { toLockedSummary } from "./types";
import type { Garment } from "@/types/garment";

function buildGarment(): Garment {
  return {
    garmentId: "garment-1",
    garmentType: "top",
    color: "blue",
  } as Garment;
}

describe("toLockedSummary branch coverage", () => {
  it("maps a full garment to its locked summary", () => {
    expect(toLockedSummary(buildGarment())).toEqual({
      id: "garment-1",
      garmentType: "top",
      color: "blue",
    });
  });

  it("preserves nullish garment attributes", () => {
    const garment = buildGarment();
    garment.garmentType = null;
    garment.color = null;
    expect(toLockedSummary(garment)).toEqual({
      id: "garment-1",
      garmentType: null,
      color: null,
    });
  });
});
