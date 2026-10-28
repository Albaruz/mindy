import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEYS } from "@/constants/query";
import type { Garment } from "@/types/garment";

const { mockAddNotification, mockUseTranslations } = vi.hoisted(() => ({
  mockAddNotification: vi.fn(),
  mockUseTranslations: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    mockUseTranslations(namespace);
    return (key: string) => `${namespace}.${key}`;
  },
}));

vi.mock("@/stores/useNotificationStore", () => ({
  useNotificationStore: {
    getState: () => ({ addNotification: mockAddNotification }),
  },
}));

import { useToggleFavorite } from "./useToggleFavorite";

function buildGarment(garmentId = "g1"): Garment {
  return {
    garmentId,
    userId: "u1",
    imageUrl: "https://example.com/g1.png",
    originalImageUrl: null,
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
    createdAt: "",
    isFavorite: false,
  };
}

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  return { queryClient, wrapper };
}

describe("useToggleFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates all garment caches optimistically and persists the change", async () => {
    const garment = buildGarment();
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(QUERY_KEYS.garments, [garment]);
    queryClient.setQueryData(QUERY_KEYS.favorites, []);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useToggleFavorite(garment.garmentId), { wrapper });
    act(() => result.current.mutate({ garment, isFavorite: true }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<Garment[]>(QUERY_KEYS.garments)?.[0]?.isFavorite).toBe(true);
    expect(queryClient.getQueryData<Garment[]>(QUERY_KEYS.favorites)?.[0]?.isFavorite).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/garments/g1/favorite",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ is_favorite: true }),
      }),
    );
    expect(mockAddNotification).toHaveBeenCalledWith(
      "success",
      "Notifications.addedToFavorites",
    );
    expect(mockUseTranslations).toHaveBeenCalledWith("Notifications");

  });

  it("rolls back every cache and reports a failed update", async () => {
    const garment = buildGarment();
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(QUERY_KEYS.garments, [garment]);
    queryClient.setQueryData(QUERY_KEYS.favorites, []);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const { result } = renderHook(() => useToggleFavorite(garment.garmentId), { wrapper });
    act(() => result.current.mutate({ garment, isFavorite: true }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<Garment[]>(QUERY_KEYS.garments)?.[0]?.isFavorite).toBe(false);
    expect(queryClient.getQueryData<Garment[]>(QUERY_KEYS.favorites)).toEqual([]);
    expect(mockAddNotification).toHaveBeenCalledWith(
      "error",
      "Notifications.favoriteFailed",
    );

  });

  it("rolls back only the failed garment when favorite writes overlap", async () => {
    const first = buildGarment("g1");
    const second = buildGarment("g2");
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(QUERY_KEYS.garments, [first, second]);
    queryClient.setQueryData(QUERY_KEYS.favorites, []);

    let rejectFirst!: (error: Error) => void;
    let resolveSecond!: (response: { ok: boolean }) => void;
    const firstResponse = new Promise<{ ok: boolean }>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const secondResponse = new Promise<{ ok: boolean }>((resolve) => {
      resolveSecond = resolve;
    });
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      String(input).includes("/g1/") ? firstResponse : secondResponse,
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result: firstHook } = renderHook(() => useToggleFavorite("g1"), {
      wrapper,
    });
    const { result: secondHook } = renderHook(() => useToggleFavorite("g2"), {
      wrapper,
    });
    let firstMutation!: Promise<void>;
    let secondMutation!: Promise<void>;
    act(() => {
      firstMutation = firstHook.current.mutateAsync({
        garment: first,
        isFavorite: true,
      });
      secondMutation = secondHook.current.mutateAsync({
        garment: second,
        isFavorite: true,
      });
    });

    await waitFor(() =>
      expect(
        queryClient
          .getQueryData<Garment[]>(QUERY_KEYS.garments)
          ?.map((item) => item.isFavorite),
      ).toEqual([true, true]),
    );
    await act(async () => {
      resolveSecond({ ok: true });
      rejectFirst(new Error("request failed"));
      await Promise.allSettled([firstMutation, secondMutation]);
    });

    expect(
      queryClient
        .getQueryData<Garment[]>(QUERY_KEYS.garments)
        ?.map((item) => item.isFavorite),
    ).toEqual([false, true]);
    expect(
      queryClient
        .getQueryData<Garment[]>(QUERY_KEYS.favorites)
        ?.map((item) => item.garmentId),
    ).toEqual(["g2"]);
  });

  it("serializes favorite requests made from separate hooks for one garment", async () => {
    const garment = buildGarment();
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(QUERY_KEYS.garments, [garment]);
    queryClient.setQueryData(QUERY_KEYS.favorites, []);
    let resolveFirst!: (response: { ok: boolean }) => void;
    let resolveSecond!: (response: { ok: boolean }) => void;
    const firstResponse = new Promise<{ ok: boolean }>((resolve) => {
      resolveFirst = resolve;
    });
    const secondResponse = new Promise<{ ok: boolean }>((resolve) => {
      resolveSecond = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(secondResponse);
    vi.stubGlobal("fetch", fetchMock);

    const { result: firstHook } = renderHook(() => useToggleFavorite("g1"), {
      wrapper,
    });
    const { result: secondHook } = renderHook(() => useToggleFavorite("g1"), {
      wrapper,
    });
    let firstMutation!: Promise<void>;
    let secondMutation!: Promise<void>;
    act(() => {
      firstMutation = firstHook.current.mutateAsync({
        garment,
        isFavorite: true,
      });
      secondMutation = secondHook.current.mutateAsync({
        garment,
        isFavorite: false,
      });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    resolveFirst({ ok: true });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    resolveSecond({ ok: true });
    await act(async () => {
      await Promise.all([firstMutation, secondMutation]);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the notifications catalog when a garment is removed from favorites", async () => {
    const garment = { ...buildGarment(), isFavorite: true };
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(QUERY_KEYS.garments, [garment]);
    queryClient.setQueryData(QUERY_KEYS.favorites, [garment]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const { result } = renderHook(() => useToggleFavorite(garment.garmentId), { wrapper });
    act(() => result.current.mutate({ garment, isFavorite: false }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAddNotification).toHaveBeenCalledWith(
      "success",
      "Notifications.removedFromFavorites",
    );
  });
});
