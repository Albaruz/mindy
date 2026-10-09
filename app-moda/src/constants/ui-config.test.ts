// Unit tests for UI configuration ranges and option lists.
import { describe, expect, it } from "vitest";
import {
  FIT_CHOICES,
  FORBIDDEN_COLOR_OPTIONS,
  MEASURE_MAX_CM,
  MEASURE_MIN_CM,
  ONBOARDING_DEFAULTS,
  SHOP_SECTIONS,
  STYLE_TRIBES,
  THERMAL_MAX,
  THERMAL_MIN,
  TOTAL_STEPS,
  clampMeasurement,
  clampThermal,
} from "./ui-config";

describe("ui-config constants", () => {
  it("exposes measurement and thermal ranges", () => {
    expect(MEASURE_MIN_CM).toBe(70);
    expect(MEASURE_MAX_CM).toBe(140);
    expect(THERMAL_MIN).toBe(1);
    expect(THERMAL_MAX).toBe(5);
    expect(TOTAL_STEPS).toBe(5);
  });

  it("clamps measurements into range and rounds", () => {
    expect(clampMeasurement(200)).toBe(MEASURE_MAX_CM);
    expect(clampMeasurement(0)).toBe(MEASURE_MIN_CM);
    expect(clampMeasurement(90.6)).toBe(91);
    expect(clampMeasurement(Number.NaN)).toBe(MEASURE_MIN_CM);
  });

  it("clamps thermal into range and rounds", () => {
    expect(clampThermal(99)).toBe(THERMAL_MAX);
    expect(clampThermal(-1)).toBe(THERMAL_MIN);
    expect(clampThermal(2.4)).toBe(2);
  });

  it("exposes forbidden color options as hex list", () => {
    expect(FORBIDDEN_COLOR_OPTIONS).toHaveLength(8);
    for (const color of FORBIDDEN_COLOR_OPTIONS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("exposes shop sections, style tribes and fit choices", () => {
    expect([...SHOP_SECTIONS]).toEqual(["women", "men", "unisex"]);
    expect([...STYLE_TRIBES]).toEqual([
      "minimalist",
      "streetwear",
      "classic",
      "boho",
    ]);
    expect([...FIT_CHOICES]).toEqual(["oversized", "regular", "fitted"]);
  });

  it("exposes onboarding defaults within valid ranges", () => {
    expect(ONBOARDING_DEFAULTS.chestCm).toBeGreaterThanOrEqual(
      MEASURE_MIN_CM,
    );
    expect(ONBOARDING_DEFAULTS.chestCm).toBeLessThanOrEqual(MEASURE_MAX_CM);
    expect(ONBOARDING_DEFAULTS.thermal).toBeGreaterThanOrEqual(THERMAL_MIN);
    expect(ONBOARDING_DEFAULTS.thermal).toBeLessThanOrEqual(THERMAL_MAX);
    expect(ONBOARDING_DEFAULTS.forbiddenColors).toEqual([]);
  });
});
