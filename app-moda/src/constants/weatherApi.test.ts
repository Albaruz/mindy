import { describe, expect, it } from "vitest";
import {
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
