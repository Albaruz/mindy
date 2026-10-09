import { describe, expect, it } from "vitest";
import {
  EYE_COLORS,
  EYE_COLOR_SWATCHES,
  HAIR_COLORS,
  HAIR_COLOR_SWATCHES,
  LIFESTYLES,
  PREFERRED_FITS,
  SKIN_TONES,
  SKIN_TONE_SWATCHES,
} from "./profileOptions";

describe("profileOptions", () => {
  it("exposes non-empty option sets", () => {
    expect(SKIN_TONES.length).toBeGreaterThan(0);
    expect(EYE_COLORS.length).toBeGreaterThan(0);
    expect(HAIR_COLORS.length).toBeGreaterThan(0);
    expect(PREFERRED_FITS.length).toBeGreaterThan(0);
    expect(LIFESTYLES.length).toBeGreaterThan(0);
  });

  it("covers every tone with a hex swatch", () => {
    for (const tone of SKIN_TONES) {
      expect(SKIN_TONE_SWATCHES[tone]).toMatch(/^#/);
    }
    for (const color of EYE_COLORS) {
      expect(EYE_COLOR_SWATCHES[color]).toMatch(/^#/);
    }
    for (const color of HAIR_COLORS) {
      expect(HAIR_COLOR_SWATCHES[color]).toMatch(/^#/);
    }
  });

  it("keeps option values unique", () => {
    for (const options of [
      SKIN_TONES,
      EYE_COLORS,
      HAIR_COLORS,
      PREFERRED_FITS,
      LIFESTYLES,
    ]) {
      expect(new Set(options).size).toBe(options.length);
    }
  });
});
