import { describe, expect, it } from "vitest";
import { inferProfile } from "./inferProfile";

function baseInput() {
  return {
    skinTone: "light",
    eyeColor: "brown",
    hairColor: "black",
    chestCm: 90,
    waistCm: 80,
    hipCm: 90,
  };
}

describe("inferProfile branch coverage", () => {
  it("infers rectangle morphology for straight figures", () => {
    const result = inferProfile({ ...baseInput(), chestCm: 90, waistCm: 82, hipCm: 90 });
    expect(result.morphology).toBe("rectangle");
  });

  it("infers autumn for olive skin with dark hair", () => {
    const result = inferProfile({ ...baseInput(), skinTone: "Olive", hairColor: "Brown" });
    expect(result.colorimetry).toBe("autumn");
  });

  it("infers autumn for medium skin with black hair", () => {
    const result = inferProfile({ ...baseInput(), skinTone: "medium", hairColor: "black" });
    expect(result.colorimetry).toBe("autumn");
  });

  it("falls back to summer for unmatched combinations", () => {
    const result = inferProfile({ ...baseInput(), skinTone: "olive", hairColor: "blonde" });
    expect(result.colorimetry).toBe("summer");
  });

  it("falls back to summer for fair skin with dark hair", () => {
    const result = inferProfile({ ...baseInput(), skinTone: "fair", hairColor: "black" });
    expect(result.colorimetry).toBe("summer");
  });
});
