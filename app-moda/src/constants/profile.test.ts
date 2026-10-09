import { describe, expect, it } from "vitest";
import {
  inferColorimetry,
  inferMorphology,
  mapFitToPreferredFit,
  mapStyleToLifestyle,
} from "@/constants/profile";

describe("inferColorimetry", () => {
  it("maps gold plus deep skin to autumn", () => {
    expect(inferColorimetry("brown", "gold")).toBe("autumn");
    expect(inferColorimetry("deep", "gold")).toBe("autumn");
  });

  it("maps gold plus fair skin to spring", () => {
    expect(inferColorimetry("fair", "gold")).toBe("spring");
  });

  it("maps silver plus deep skin to winter", () => {
    expect(inferColorimetry("olive", "silver")).toBe("winter");
  });

  it("maps silver plus fair skin to summer", () => {
    expect(inferColorimetry("light", "silver")).toBe("summer");
  });
});

describe("inferMorphology", () => {
  it("covers all five branches", () => {
    expect(inferMorphology(88, 70, 95)).toBe("triangle");
    expect(inferMorphology(96, 78, 88)).toBe("inverted_triangle");
    expect(inferMorphology(90, 70, 90)).toBe("hourglass");
    expect(inferMorphology(100, 102, 100)).toBe("oval");
    expect(inferMorphology(90, 82, 91)).toBe("rectangle");
  });
});

describe("mapStyleToLifestyle", () => {
  it("maps wizard tribes to lifestyles", () => {
    expect(mapStyleToLifestyle("minimalist")).toBe("casual_daily");
    expect(mapStyleToLifestyle("classic")).toBe("corporate_office");
    expect(mapStyleToLifestyle("streetwear")).toBe("social_events");
    expect(mapStyleToLifestyle("boho")).toBe("home_remote");
  });
});

describe("mapFitToPreferredFit", () => {
  it("maps fit choices", () => {
    expect(mapFitToPreferredFit("fitted")).toBe("slim");
    expect(mapFitToPreferredFit("regular")).toBe("regular");
    expect(mapFitToPreferredFit("oversized")).toBe("oversized");
  });
});
