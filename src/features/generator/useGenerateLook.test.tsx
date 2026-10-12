// Unit tests for the legacy single-look generation hook: candidate
// filtering, server error forwarding, and applying the best option.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import type { Garment } from "@/types/garment";
import { API_ROUTES } from "@/constants/api";
import { DEFAULT_TEMPERATURE_C } from "@/constants/weather";
import { useGeneratorStore } from "./useGeneratorStore";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import { useGenerateLook } from "./useGenerateLook";

function buildGarment(
  id: string,
  type: Garment["garmentType"],
  isDirty = false,
): Garment {
  return {
    garmentId: id,
    userId: "user-1",
    imageUrl: null,
    garmentType: type,
    style: "casual",
    cutLength: null,
    color: "black",
    material: "cotton",
    season: "all",
    isDirty,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "2026-01-01",
  };
}

const mockFetch = vi.fn();

function recommenderResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body,
  };
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("useGenerateLook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGeneratorStore.getState().resetFlow();
    useNotificationStore.setState({ notifications: [] });
    // Geolocation stays unavailable so temperature resolution uses the
    // default without touching the weather endpoint.
    if ("geolocation" in navigator) {
      Object.defineProperty(navigator, "geolocation", {
        value: undefined,
        configurable: true,
      });
    }
    mockFetch.mockImplementation(async (url: string) => {
      if (url.startsWith(API_ROUTES.weather)) {
        return recommenderResponse({ temperatureC: 21 });
      }
      return recommenderResponse({ options: [] });
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  it("rejects when the closet is empty", async () => {
    const { result } = renderHook(() => useGenerateLook(), {
      wrapper: createWrapper(),
    });
    await expect(
      result.current.mutateAsync({
        garments: [],
        profile: null,
        mood: "relaxed",
      }),
    ).rejects.toThrow("Add garments");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects when every candidate is dirty or dismissed", async () => {
    useGeneratorStore.setState({ dismissedIds: ["bottom-1"] });
    const garments = [
      buildGarment("top-1", "top", true),
      buildGarment("bottom-1", "bottom"),
    ];
    const { result } = renderHook(() => useGenerateLook(), {
      wrapper: createWrapper(),
    });
    await expect(
      result.current.mutateAsync({
        garments,
        profile: null,
        mood: "relaxed",
      }),
    ).rejects.toThrow("Add garments");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards the server error message", async () => {
    mockFetch.mockResolvedValue(
      recommenderResponse({ error: "Stylist is busy" }, false),
    );
    const { result } = renderHook(() => useGenerateLook(), {
      wrapper: createWrapper(),
    });
    await expect(
      result.current.mutateAsync({
        garments: [buildGarment("top-1", "top")],
        profile: null,
        mood: "relaxed",
      }),
    ).rejects.toThrow("Stylist is busy");
  });

  it("falls back to a generic message on an unreadable error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("bad payload");
      },
    });
    const { result } = renderHook(() => useGenerateLook(), {
      wrapper: createWrapper(),
    });
    await expect(
      result.current.mutateAsync({
        garments: [buildGarment("top-1", "top")],
        profile: null,
        mood: "relaxed",
      }),
    ).rejects.toThrow("unavailable");
  });

  it("rejects when the server returns no options", async () => {
    mockFetch.mockResolvedValue(recommenderResponse({ options: [] }));
    const { result } = renderHook(() => useGenerateLook(), {
      wrapper: createWrapper(),
    });
    await expect(
      result.current.mutateAsync({
        garments: [buildGarment("top-1", "top")],
        profile: null,
        mood: "relaxed",
      }),
    ).rejects.toThrow("no options");
  });

  it("rejects when no returned garment can be used", async () => {
    mockFetch.mockResolvedValue(
      recommenderResponse({ options: [{ garmentIds: ["unknown"] }] }),
    );
    const { result } = renderHook(() => useGenerateLook(), {
      wrapper: createWrapper(),
    });
    await expect(
      result.current.mutateAsync({
        garments: [buildGarment("top-1", "top")],
        profile: null,
        mood: "relaxed",
      }),
    ).rejects.toThrow("no usable garments");
  });

  it("applies the best option and reports the default temperature", async () => {
    const top = buildGarment("top-1", "top");
    const bottom = buildGarment("bottom-1", "bottom");
    mockFetch.mockResolvedValue(
      recommenderResponse({ options: [{ garmentIds: ["top-1", "bottom-1"] }] }),
    );
    const { result } = renderHook(() => useGenerateLook(), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({
      garments: [top, bottom],
      profile: null,
      mood: "relaxed",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const slots = useGeneratorStore.getState().slots;
    expect(slots.top.garment?.garmentId).toBe("top-1");
    expect(slots.bottom.garment?.garmentId).toBe("bottom-1");
    const [, body] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(body?.body as string).temperatureC).toBe(
      DEFAULT_TEMPERATURE_C,
    );
    const notifications = useNotificationStore.getState().notifications;
    expect(
      notifications.some(
        (entry) =>
          entry.type === "success" &&
          entry.message.includes("Locked garments were preserved"),
      ),
    ).toBe(true);
  });

  it("preserves locked slots when applying the best option", async () => {
    const lockedTop = buildGarment("top-locked", "top");
    const otherTop = buildGarment("top-2", "top");
    const bottom = buildGarment("bottom-1", "bottom");
    useGeneratorStore.getState().toggleLockGarment("top", lockedTop);
    mockFetch.mockResolvedValue(
      recommenderResponse({ options: [{ garmentIds: ["top-2", "bottom-1"] }] }),
    );
    const { result } = renderHook(() => useGenerateLook(), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({
      garments: [lockedTop, otherTop, bottom],
      profile: null,
      mood: "relaxed",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const slots = useGeneratorStore.getState().slots;
    expect(slots.top.garment?.garmentId).toBe("top-locked");
    expect(slots.bottom.garment?.garmentId).toBe("bottom-1");
  });

  it("keeps dirty reusable garments as candidates", async () => {
    const shoes = buildGarment("shoes-1", "footwear", true);
    mockFetch.mockResolvedValue(
      recommenderResponse({ options: [{ garmentIds: ["shoes-1"] }] }),
    );
    const { result } = renderHook(() => useGenerateLook(), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({
      garments: [shoes],
      profile: null,
      mood: "relaxed",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      useGeneratorStore.getState().slots.footwear.garment?.garmentId,
    ).toBe("shoes-1");
  });
});
