import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { Colorimetry } from "@/types/user";
import {
  SEASON_ACCENTS,
  WeatherThreadIcon,
  resolveThreadKind,
  seasonAccent,
} from "./WeatherThreadIcon";
import type { WeatherInfo } from "@/types/weather";

function buildWeather(
  overrides: Partial<WeatherInfo> = {},
): WeatherInfo {
  return {
    temperatureC: 18,
    condition: null,
    city: null,
    dayLow: null,
    dayHigh: null,
    dayCondition: null,
    rainProbability: null,
    fallback: false,
    ...overrides,
  };
}

describe("resolveThreadKind", () => {
  it("maps snow and clear conditions directly", () => {
    expect(resolveThreadKind(buildWeather({ condition: "Snow" }))).toBe("snow");
    expect(resolveThreadKind(buildWeather({ condition: "Clear" }))).toBe("sun");
  });

  it("prefers the day summary over the current condition", () => {
    expect(
      resolveThreadKind(
        buildWeather({ condition: "Snow", dayCondition: "Clear" }),
      ),
    ).toBe("sun");
    expect(
      resolveThreadKind(
        buildWeather({ condition: "Clear", dayCondition: "Rain" }),
      ),
    ).toBe("umbrella");
  });

  it("treats every wet condition as umbrella", () => {
    for (const condition of ["Rain", "Drizzle", "Thunderstorm"]) {
      expect(resolveThreadKind(buildWeather({ condition }))).toBe("umbrella");
    }
  });

  it("opens the umbrella on likely rain even when skies look dry", () => {
    expect(
      resolveThreadKind(
        buildWeather({ condition: "Clouds", rainProbability: 80 }),
      ),
    ).toBe("umbrella");
    expect(
      resolveThreadKind(
        buildWeather({ condition: "Clouds", rainProbability: 10 }),
      ),
    ).toBe("cloud");
  });

  it("falls back to cloud for anything else", () => {
    expect(resolveThreadKind(buildWeather({ condition: "Clouds" }))).toBe(
      "cloud",
    );
    expect(resolveThreadKind(buildWeather())).toBe("cloud");
    expect(resolveThreadKind(buildWeather({ condition: "Mist" }))).toBe(
      "cloud",
    );
  });
});

describe("seasonAccent", () => {
  it("returns the seasonal tint per colorimetry", () => {
    const seasons: Colorimetry[] = ["spring", "summer", "autumn", "winter"];
    for (const season of seasons) {
      expect(seasonAccent(season)).toBe(SEASON_ACCENTS[season]);
    }
  });

  it("defaults without colorimetry or on unknown seasons", () => {
    expect(seasonAccent(null)).toBe("#c87966");
    expect(seasonAccent(undefined)).toBe("#c87966");
    expect(seasonAccent("unknown" as Colorimetry)).toBe("#c87966");
  });
});

describe("WeatherThreadIcon", () => {
  it("renders one svg per thread kind", () => {
    for (const kind of ["umbrella", "cloud", "snow", "sun"] as const) {
      const { container, unmount } = render(
        <WeatherThreadIcon kind={kind} accent="#c87966" />,
      );
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });
});
