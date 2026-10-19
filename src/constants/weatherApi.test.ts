import { describe, expect, it } from "vitest";
import { getSeasonalFallbackWeather } from "./weather";

describe("getSeasonalFallbackWeather", () => {
  it.each([
    [new Date(2026, 0, 15), 10, "Clouds"],
    [new Date(2026, 3, 15), 16, "Clear"],
    [new Date(2026, 6, 15), 24, "Clear"],
    [new Date(2026, 9, 15), 18, "Clouds"],
  ])("returns the Spanish seasonal profile for %s", (date, temperatureC, condition) => {
    expect(getSeasonalFallbackWeather(date as Date)).toMatchObject({
      temperatureC,
      condition,
    });
  });
});
import {
  isRainVulnerableMaterial,
  isRainyConditionValue,
  RAIN_EXPECTED_THRESHOLD,
} from "./weather";
import { API_ROUTES, buildWeatherUrl, RATE_LIMITS } from "./api";

describe("isRainyConditionValue", () => {
  it("detects rainy conditions case-insensitively", () => {
    expect(isRainyConditionValue("Rain")).toBe(true);
    expect(isRainyConditionValue("CLEAR")).toBe(false);
    expect(isRainyConditionValue("drizzle")).toBe(true);
  });

  it("exposes rain threshold", () => {
    expect(RAIN_EXPECTED_THRESHOLD).toBe(50);
  });
});

describe("isRainVulnerableMaterial", () => {
  it("flags closed silk case-insensitively", () => {
    expect(isRainVulnerableMaterial("silk", null)).toBe(true);
    expect(isRainVulnerableMaterial("Silk", null)).toBe(true);
    expect(isRainVulnerableMaterial("cotton", null)).toBe(false);
    expect(isRainVulnerableMaterial(null, null)).toBe(false);
  });

  it("detects suede in free-text detail (EN/ES)", () => {
    expect(isRainVulnerableMaterial("leather", "suede jacket")).toBe(true);
    expect(isRainVulnerableMaterial(null, "gamuza")).toBe(true);
    expect(isRainVulnerableMaterial(null, "ante")).toBe(true);
    expect(isRainVulnerableMaterial("cotton", "plain weave")).toBe(false);
  });
});

describe("buildWeatherUrl", () => {
  it("builds endpoint with coordinates", () => {
    expect(buildWeatherUrl(40.4, -3.7)).toBe(
      `${API_ROUTES.weather}?lat=40.4&lon=-3.7`,
    );
  });
});

describe("RATE_LIMITS", () => {
  it("keeps recommender quota at 5 per minute", () => {
    expect(RATE_LIMITS.recommender.limit).toBe(5);
    expect(RATE_LIMITS.recommender.windowMs).toBe(60_000);
  });
});
