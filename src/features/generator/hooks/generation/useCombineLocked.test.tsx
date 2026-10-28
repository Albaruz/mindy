import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("../weather/useWeatherQuery", () => ({
  useWeatherQuery: () => ({ data: undefined }),
}));

import { useCombineLocked } from "./useCombineLocked";
import { useGeneratorStore } from "../../state/generator-store/useGeneratorStore";
import type { Garment } from "@/types/garment";

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

describe("useCombineLocked", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useGeneratorStore.getState().resetFlow();
  });

  it("throws with empty closet", async () => {
    const { result } = renderHook(() => useCombineLocked(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ garments: [], profile: null });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("ranks suggestions from options", async () => {
    const garments = [buildGarment("t1", "top"), buildGarment("b1", "bottom")];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ options: [{ garmentIds: ["t1", "b1"] }] }),
      ),
    );
    try {
      const { result } = renderHook(() => useCombineLocked(), {
        wrapper: createWrapper(),
      });
      result.current.mutate({ garments, profile: null });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.suggestions.top).toEqual(["t1"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("surfaces server errors", async () => {
    const garments = [buildGarment("t1", "top")];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "busy" }), { status: 500 }),
      ),
    );
    try {
      const { result } = renderHook(() => useCombineLocked(), {
        wrapper: createWrapper(),
      });
      result.current.mutate({ garments, profile: null });
      await waitFor(() => expect(result.current.isError).toBe(true));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
