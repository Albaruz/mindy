import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

import { useWeatherQuery } from "./useWeatherQuery";
import { getSeasonalFallbackWeather } from "@/constants/weather";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

// jsdom has no geolocation: define one resolving fixed coordinates.
function mockGeolocation() {
  Object.defineProperty(navigator, "geolocation", {
    value: {
      getCurrentPosition: (success: PositionCallback) =>
        success({
          coords: { latitude: 40.4, longitude: -3.7 },
        } as GeolocationPosition),
    },
    configurable: true,
  });
}

afterEach(() => {
  const record = navigator as unknown as Record<string, unknown>;
  if ("geolocation" in navigator) {
    delete record.geolocation;
  }
  vi.unstubAllGlobals();
});

describe("useWeatherQuery hook", () => {
  it("parses the weather payload and clamps rain probability", async () => {
    mockGeolocation();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          temperatureC: 21.5,
          condition: "Clear",
          city: "Madrid",
          dayLow: 15,
          dayHigh: 26,
          dayCondition: "Clouds",
          rainProbability: 87.6,
          fallback: false,
        }),
      }),
    );
    const { result } = renderHook(() => useWeatherQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual({
      temperatureC: 21.5,
      condition: "Clear",
      city: "Madrid",
      dayLow: 15,
      dayHigh: 26,
      dayCondition: "Clouds",
      rainProbability: 88,
      fallback: false,
    });
  });

  it("returns a safe fallback when the weather request fails", async () => {
    mockGeolocation();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const { result } = renderHook(() => useWeatherQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ temperatureC: getSeasonalFallbackWeather().temperatureC, fallback: true });
  });

  it("returns a safe fallback without geolocation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useWeatherQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ temperatureC: getSeasonalFallbackWeather().temperatureC, fallback: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a safe fallback when fetch throws (offline)", async () => {
    mockGeolocation();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const { result } = renderHook(() => useWeatherQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ temperatureC: getSeasonalFallbackWeather().temperatureC, fallback: true });
  });

  it("returns null on malformed payloads", async () => {
    mockGeolocation();
    for (const payload of [
      null,
      { temperatureC: "warm" },
      { temperatureC: 20, rainProbability: Number.NaN },
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
      );
      const { result, unmount } = renderHook(() => useWeatherQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // Null payload or non-numeric temperature produce the safe fallback.
      if (payload === null || typeof payload.temperatureC !== "number") {
        expect(result.current.data).toMatchObject({ temperatureC: getSeasonalFallbackWeather().temperatureC, fallback: true });
      } else {
        // NaN probability is sanitized to null, payload stays usable.
        expect(result.current.data?.rainProbability).toBeNull();
      }
      unmount();
      vi.unstubAllGlobals();
    }
  });
});
