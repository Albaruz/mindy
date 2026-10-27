import { describe, expect, it } from "vitest";
import {
  isRainExpected,
  isRainyCondition,
  shouldShowOuterwear,
} from "./useWeatherQuery";
import type { WeatherInfo } from "@/types/weather";

function buildWeather(overrides: Partial<WeatherInfo> = {}): WeatherInfo {
  return {
    temperatureC: 20,
    condition: "Clear",
    city: null,
    dayLow: null,
    dayHigh: null,
    dayCondition: null,
    rainProbability: null,
    fallback: false,
    ...overrides,
  };
}

describe("isRainyCondition", () => {
  it("detects rainy conditions case-insensitively", () => {
    expect(isRainyCondition("Rain")).toBe(true);
    expect(isRainyCondition("Clear")).toBe(false);
    expect(isRainyCondition(null)).toBe(false);
    expect(isRainyCondition(undefined)).toBe(false);
  });
});

describe("isRainExpected", () => {
  it("flags probability at or above threshold", () => {
    expect(isRainExpected(50)).toBe(true);
    expect(isRainExpected(49)).toBe(false);
    expect(isRainExpected(null)).toBe(false);
    expect(isRainExpected(undefined)).toBe(false);
  });
});

describe("shouldShowOuterwear", () => {
  it("shows owned outerwear without weather data", () => {
    expect(shouldShowOuterwear(null, 2)).toBe(true);
    expect(shouldShowOuterwear(undefined, 0)).toBe(false);
    expect(shouldShowOuterwear(buildWeather({ fallback: true }), 1)).toBe(
      true,
    );
  });

  it("shows on cold days", () => {
    expect(shouldShowOuterwear(buildWeather({ dayLow: 5 }), 1)).toBe(true);
    expect(shouldShowOuterwear(buildWeather({ dayLow: 15 }), 1)).toBe(true);
    expect(
      shouldShowOuterwear(buildWeather({ temperatureC: 15 }), 1),
    ).toBe(true);
    expect(
      shouldShowOuterwear(
        buildWeather({ temperatureC: 15, dayLow: 16 }),
        1,
      ),
    ).toBe(true);
  });

  it("shows on rain", () => {
    expect(shouldShowOuterwear(buildWeather({ condition: "Rain" }), 1)).toBe(
      true,
    );
    expect(
      shouldShowOuterwear(buildWeather({ rainProbability: 80 }), 1),
    ).toBe(true);
  });

  it("hides on mild clear days", () => {
    expect(shouldShowOuterwear(buildWeather(), 1)).toBe(false);
  });
});
