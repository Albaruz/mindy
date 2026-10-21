import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("./useWeatherQuery", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useWeatherQuery: () => ({ data: undefined }),
  };
});

import {
  resolveCachedClimate,
  useGenerateLooks,
} from "./useGenerateLooks";
import { useGeneratorStore } from "./useGeneratorStore";
import { ERROR_CODES } from "@/constants/errors";
import { getSeasonalFallbackWeather } from "@/constants/weather";
import { AppError } from "@/lib/errors";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("useGenerateLooks mutation", () => {
  beforeEach(() => {
    useGeneratorStore.getState().resetFlow();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an empty closet without calling the stylist", async () => {
    const fetchMock = vi.mocked(fetch);
    const { result } = renderHook(() => useGenerateLooks(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ garments: [], profile: null, style: "casual" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(AppError);
    expect((result.current.error as AppError).code).toBe(ERROR_CODES.NO_GARMENTS);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("resolveCachedClimate", () => {
  it("uses the seasonal fallback while weather is still loading", () => {
    const climate = resolveCachedClimate(undefined, "today");
    expect(climate.temperatureC).toBe(getSeasonalFallbackWeather().temperatureC);
  });

  it("uses cached weather without waiting for geolocation", () => {
    const climate = resolveCachedClimate(
      {
        temperatureC: 18,
        condition: "Clear",
        city: "Madrid",
        dayLow: 10,
        dayHigh: 20,
        dayCondition: "Clear",
        rainProbability: 0,
        fallback: false,
        today: {
          temperatureC: 18,
          condition: "Clear",
          dayLow: 10,
          dayHigh: 20,
          dayCondition: "Clear",
          rainProbability: 0,
        },
      },
      "today",
    );
    expect(climate).toEqual({
      temperatureC: 18,
      condition: "Clear",
      dayLow: 10,
      dayHigh: 20,
      rainProbability: 0,
    });
  });
});