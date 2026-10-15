import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import type { Garment } from "@/types/garment";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

import {
  InsufficientStyleGarmentsError,
  useGenerateLooks,
} from "./useGenerateLooks";
import { useGeneratorStore } from "./useGeneratorStore";
import { ERROR_CODES } from "@/constants/errors";
import { AppError } from "@/lib/errors";

function buildGarment(id: string, type: Garment["garmentType"]): Garment {
  return {
    garmentId: id,
    userId: "u1",
    imageUrl: null,
    garmentType: type,
    style: "casual",
    cutLength: null,
    color: "black",
    material: "cotton",
    season: "all",
    isDirty: false,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "",
  };
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

describe("useGenerateLooks mutation", () => {
  beforeEach(() => {
    useGeneratorStore.getState().resetFlow();
    // Geolocation stays missing so resolveClimate short-circuits to the
    // default climate; fetch is only stubbed for the recommender call.
    const record = navigator as unknown as Record<string, unknown>;
    if ("geolocation" in navigator) {
      delete record.geolocation;
    }
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

  it("lands on the shortage state on strict style rejection (422)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: "INSUFFICIENT_STYLE_GARMENTS" }, 422) as Response,
    );
    const { result } = renderHook(() => useGenerateLooks(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      garments: [buildGarment("t1", "top"), buildGarment("b1", "bottom")],
      profile: null,
      style: "formal",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(InsufficientStyleGarmentsError);
    expect(
      (result.current.error as InsufficientStyleGarmentsError).style,
    ).toBe("formal");
    expect(useGeneratorStore.getState().insufficientStyle).toBe("formal");
    expect(useGeneratorStore.getState().view).toBe("showcase");
  });

  it("normalizes server error codes on failure", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: "STYLIST_DOWN" }, 500) as Response,
    );
    const { result } = renderHook(() => useGenerateLooks(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      garments: [buildGarment("t1", "top")],
      profile: null,
      style: "casual",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as AppError).code).toBe(
      ERROR_CODES.STYLIST_UNAVAILABLE,
    );
    expect(useGeneratorStore.getState().view).toBe("auto-select");
  });

  it("maps options to looks and flags the local fallback", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        options: [
          {
            garmentIds: ["t1", "b1"],
            reason: "Sharp pairing.",
            suitabilityRatio: 92,
          },
          { garmentIds: ["unknown-id"], reason: "Ghost.", suitabilityRatio: 1 },
        ],
        _isFallback: true,
      }) as Response,
    );
    const { result } = renderHook(() => useGenerateLooks(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      garments: [
        buildGarment("t1", "top"),
        buildGarment("b1", "bottom"),
        buildGarment("s1", "footwear"),
      ],
      profile: null,
      style: "casual",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Unknown IDs are skipped, so only the valid option becomes a look.
    expect(result.current.data?.looks).toHaveLength(1);
    expect(result.current.data?.isFallback).toBe(true);
    expect(result.current.data?.looks[0].garments.map((g) => g.garmentId)).toEqual(
      ["t1", "b1"],
    );
    expect(result.current.data?.looks[0].reason).toBe("Sharp pairing.");
    expect(useGeneratorStore.getState().view).toBe("showcase");
    expect(useGeneratorStore.getState().fallbackGarmentIds).toEqual([
      "t1",
      "b1",
    ]);
    // The request carries the default climate plus the mapped mood/style.
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.style).toBe("casual");
    expect(body.mood).toBe("relaxed");
    expect(body.temperatureC).toBe(20);
  });

  it("rejects responses without usable garments", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        options: [{ garmentIds: ["unknown-id"], suitabilityRatio: 5 }],
      }) as Response,
    );
    const { result } = renderHook(() => useGenerateLooks(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      garments: [buildGarment("t1", "top")],
      profile: null,
      style: "casual",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as AppError).code).toBe(
      ERROR_CODES.NO_USABLE_GARMENTS,
    );
  });

  it("rejects responses without options", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ options: [] }) as Response);
    const { result } = renderHook(() => useGenerateLooks(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      garments: [buildGarment("t1", "top")],
      profile: null,
      style: "casual",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as AppError).code).toBe(ERROR_CODES.NO_OPTIONS);
  });
});
