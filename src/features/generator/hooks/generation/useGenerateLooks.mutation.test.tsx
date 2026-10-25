import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("../weather/useWeatherQuery", async (importOriginal) => {
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
import { useGeneratorStore } from "../../state/generator-store/useGeneratorStore";
import { ERROR_CODES } from "@/constants/errors";
import { getSeasonalFallbackWeather } from "@/constants/weather";
import { AppError } from "@/lib/errors";
import type { Garment } from "@/types/garment";

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

  it("sends a selected available favorite as a forced recommender candidate", async () => {
    const favoriteTop = {
      garmentId: "favorite-top",
      userId: "user-1",
      imageUrl: null,
      garmentType: "top",
      style: "casual",
      cutLength: null,
      styles: ["casual"],
      cuts: [],
      color: "black",
      material: "cotton",
      season: "all",
      isDirty: false,
      lastWornDate: null,
      isExternalGarment: false,
      extraTags: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      isFavorite: true,
    } as Garment;
    const bottom = {
      ...favoriteTop,
      garmentId: "bottom",
      garmentType: "bottom",
      isDirty: false,
      isFavorite: false,
    } as Garment;
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        `data: ${JSON.stringify({
          type: "complete",
          payload: {
            options: [{ garmentIds: ["favorite-top", "bottom"] }],
            _isFallback: false,
          },
        })}\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      ),
    );
    const { result } = renderHook(() => useGenerateLooks(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      garments: [favoriteTop, bottom],
      profile: null,
      style: "casual",
      forcedFavoritesIds: ["favorite-top"],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      garments: Array<{ garmentId: string }>;
      forcedFavoritesIds: string[];
    };
    expect(request.garments.map((garment) => garment.garmentId)).toContain(
      "favorite-top",
    );
    expect(request.forcedFavoritesIds).toContain("favorite-top");
  });

  it("sends optional favorites separately from explicit forced favorites", async () => {
    const favoriteTop = {
      garmentId: "favorite-top",
      userId: "user-1",
      imageUrl: null,
      garmentType: "top",
      style: "casual",
      cutLength: null,
      styles: ["casual"],
      cuts: [],
      color: "black",
      material: "cotton",
      season: "all",
      isDirty: false,
      lastWornDate: null,
      isExternalGarment: false,
      extraTags: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      isFavorite: true,
    } as Garment;
    const bottom = {
      ...favoriteTop,
      garmentId: "bottom",
      garmentType: "bottom",
      isFavorite: false,
    } as Garment;
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        `data: ${JSON.stringify({
          type: "complete",
          payload: {
            options: [{ garmentIds: ["favorite-top", "bottom"] }],
            _isFallback: false,
          },
        })}\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      ),
    );
    const { result } = renderHook(() => useGenerateLooks(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      garments: [favoriteTop, bottom],
      profile: null,
      style: "casual",
      suggestedFavoriteIds: ["favorite-top", "not-in-closet"],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      forcedFavoritesIds: string[];
      suggestedFavoriteIds: string[];
    };
    expect(request.forcedFavoritesIds).toEqual([]);
    expect(request.suggestedFavoriteIds).toEqual(["favorite-top"]);
  });

  it("does not send an explicit favorite as an optional suggestion too", async () => {
    const favoriteTop = {
      garmentId: "favorite-top",
      userId: "user-1",
      imageUrl: null,
      garmentType: "top",
      style: "casual",
      cutLength: null,
      styles: ["casual"],
      cuts: [],
      color: "black",
      material: "cotton",
      season: "all",
      isDirty: false,
      lastWornDate: null,
      isExternalGarment: false,
      extraTags: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      isFavorite: true,
    } as Garment;
    const bottom = { ...favoriteTop, garmentId: "bottom", garmentType: "bottom" } as Garment;
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        `data: ${JSON.stringify({
          type: "complete",
          payload: {
            options: [{ garmentIds: ["favorite-top", "bottom"] }],
            _isFallback: false,
          },
        })}\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      ),
    );
    const { result } = renderHook(() => useGenerateLooks(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      garments: [favoriteTop, bottom],
      profile: null,
      style: "casual",
      forcedFavoritesIds: ["favorite-top"],
      suggestedFavoriteIds: ["favorite-top"],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      forcedFavoritesIds: string[];
      suggestedFavoriteIds: string[];
    };
    expect(request.forcedFavoritesIds).toEqual(["favorite-top"]);
    expect(request.suggestedFavoriteIds).toEqual([]);
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
