import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

const { mockGetUser, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
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
    mockRpc.mockResolvedValue({ error: null });
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
    const { result } = renderHook(() => useWearToday(), {
      wrapper: createWrapper(),
    });
    result.current.mutate([
      buildGarment("00000000-0000-4000-8000-000000000001", "top"),
      buildGarment("00000000-0000-4000-8000-000000000002", "footwear"),
    ]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledWith("record_worn_outfit", {
      p_garment_ids: [
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
      ],
      p_dirty_ids: ["00000000-0000-4000-8000-000000000001"],
      p_worn_date: expect.any(String),
    });
    expect(
      useGeneratorStore.getState().celebrationGarments,
    ).toHaveLength(2);
  });

  it("drops stale bottom under a one-piece dress", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { result } = renderHook(() => useWearToday(), {
      wrapper: createWrapper(),
    });
    result.current.mutate([
      buildGarment("00000000-0000-4000-8000-000000000003", "dress"),
      buildGarment("00000000-0000-4000-8000-000000000004", "bottom"),
    ]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((entry) => entry.garmentId)).toEqual([
      "00000000-0000-4000-8000-000000000003",
    ]);
  });

  it("does not celebrate if the atomic database operation fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockRpc.mockResolvedValue({ error: new Error("transaction failed") });
    const { result } = renderHook(() => useWearToday(), {
      wrapper: createWrapper(),
    });
    result.current.mutate([
      buildGarment("00000000-0000-4000-8000-000000000005", "top"),
    ]);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useGeneratorStore.getState().celebrationGarments).toBeNull();
  });
});
