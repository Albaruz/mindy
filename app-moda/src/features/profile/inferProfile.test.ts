import { describe, expect, it } from "vitest";
import { inferProfile } from "./inferProfile";

describe("inferProfile", () => {
  it("infers triangle morphology when hips exceed chest", () => {
    const result = inferProfile({
      skinTone: "light",
      eyeColor: "brown",
      hairColor: "black",
      chestCm: 88,
      waistCm: 70,
      hipCm: 95,
    });
    expect(result.morphology).toBe("triangle");
  });

  it("infers inverted triangle when chest exceeds hips", () => {
    const result = inferProfile({
      skinTone: "light",
      eyeColor: "brown",
      hairColor: "black",
      chestCm: 96,
      waistCm: 78,
      hipCm: 88,
    });
    expect(result.morphology).toBe("inverted_triangle");
  });

  it("infers hourglass on balanced curves", () => {
    const result = inferProfile({
      skinTone: "light",
      eyeColor: "brown",
      hairColor: "black",
      chestCm: 90,
      waistCm: 70,
      hipCm: 90,
    });
    expect(result.morphology).toBe("hourglass");
  });

  it("infers oval when waist dominates", () => {
    const result = inferProfile({
      skinTone: "light",
      eyeColor: "brown",
      hairColor: "black",
      chestCm: 100,
      waistCm: 102,
      hipCm: 100,
    });
    expect(result.morphology).toBe("oval");
  });

  it("infers winter colorimetry for deep skin tones", () => {
    const result = inferProfile({
      skinTone: "deep",
      eyeColor: "brown",
      hairColor: "black",
      chestCm: 90,
      waistCm: 80,
      hipCm: 90,
    });
    expect(result.colorimetry).toBe("winter");
  });

  it("infers spring for fair skin and blonde hair", () => {
    const result = inferProfile({
      skinTone: "fair",
      eyeColor: "blue",
      hairColor: "blonde",
      chestCm: 90,
      waistCm: 80,
      hipCm: 90,
    });
    expect(result.colorimetry).toBe("spring");
  });
});
