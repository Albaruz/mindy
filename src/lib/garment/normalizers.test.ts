import { describe, expect, it } from "vitest";
import {
  normalizeGarmentColor,
  normalizeGarmentCut,
  normalizeGarmentMaterial,
  normalizeGarmentSeason,
  normalizeGarmentStyle,
  normalizeGarmentType,
} from "./normalizers";

describe("normalizeGarmentType", () => {
  it("returns base for closed values", () => {
    expect(normalizeGarmentType("top")).toEqual({ base: "top", detail: null });
    expect(normalizeGarmentType("dress")).toEqual({
      base: "dress",
      detail: null,
    });
  });

  it("maps aliases with detail", () => {
    expect(normalizeGarmentType("camisa")).toEqual({
      base: "top",
      detail: "camisa",
    });
    expect(normalizeGarmentType("sneakers")).toEqual({
      base: "footwear",
      detail: "sneakers",
    });
  });

  it("handles accents and case", () => {
    expect(normalizeGarmentType("PANTALÓN")).toEqual({
      base: "bottom",
      detail: "pantalon",
    });
  });

  it("returns null base for unknown and non-string", () => {
    expect(normalizeGarmentType("spaceship")).toEqual({
      base: null,
      detail: "spaceship",
    });
    expect(normalizeGarmentType(null)).toEqual({ base: null, detail: null });
    expect(normalizeGarmentType("")).toEqual({ base: null, detail: null });
  });
});

describe("normalizeGarmentColor", () => {
  it("maps shades to base spectrum", () => {
    expect(normalizeGarmentColor("burgundy").base).toBe("red");
    expect(normalizeGarmentColor("burdeos").base).toBe("red");
    expect(normalizeGarmentColor("turquesa").base).toBe("blue");
  });

  it("keeps closed base without detail", () => {
    expect(normalizeGarmentColor("red")).toEqual({ base: "red", detail: null });
  });
});

describe("normalizeGarmentMaterial", () => {
  it("maps spanish materials", () => {
    expect(normalizeGarmentMaterial("cuero").base).toBe("leather");
    expect(normalizeGarmentMaterial("lino").base).toBe("linen");
  });
});

describe("normalizeGarmentStyle", () => {
  it("maps style aliases", () => {
    expect(normalizeGarmentStyle("oficina").base).toBe("formal");
    expect(normalizeGarmentStyle("noche").base).toBe("party");
  });
});

describe("normalizeGarmentCut", () => {
  it("maps cut aliases", () => {
    expect(normalizeGarmentCut("skinny").base).toBe("slim");
    expect(normalizeGarmentCut("largo").base).toBe("long");
  });
});

describe("normalizeGarmentSeason", () => {
  it("accepts closed seasons only", () => {
    expect(normalizeGarmentSeason("winter")).toEqual({
      base: "winter",
      detail: null,
    });
    expect(normalizeGarmentSeason("verano")).toEqual({
      base: null,
      detail: null,
    });
    expect(normalizeGarmentSeason(null)).toEqual({
      base: null,
      detail: null,
    });
  });
});
