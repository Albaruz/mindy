import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

const { mockGetUser, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === "outfit_history") return { insert: mockInsert };
      return { update: () => ({ in: () => ({ eq: mockUpdate }) }) };
    },
  }),
}));

import { useWearToday } from "./useWearToday";
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

describe("useWearToday", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useGeneratorStore.getState().resetFlow();
  });

  it("throws without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useWearToday(), {
      wrapper: createWrapper(),
    });
    result.current.mutate([buildGarment("t1", "top")]);
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("persists look and celebrates", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useWearToday(), {
      wrapper: createWrapper(),
    });
    result.current.mutate([
      buildGarment("t1", "top"),
      buildGarment("s1", "footwear"),
    ]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInsert).toHaveBeenCalled();
    // Only the top is marked dirty; footwear is exempt.
    expect(mockUpdate).toHaveBeenCalled();
    expect(
      useGeneratorStore.getState().celebrationGarments,
    ).toHaveLength(2);
  });

  it("drops stale bottom under a one-piece dress", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useWearToday(), {
      wrapper: createWrapper(),
    });
    result.current.mutate([
      buildGarment("d1", "dress"),
      buildGarment("b1", "bottom"),
    ]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((entry) => entry.garmentId)).toEqual([
      "d1",
    ]);
  });
});
