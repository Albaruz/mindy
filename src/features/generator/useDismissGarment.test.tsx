import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDismissGarment } from "./useDismissGarment";
import { useGeneratorStore } from "./useGeneratorStore";
import type { Garment } from "@/types/garment";

const { mockGetUser, mockInsert } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ insert: mockInsert }),
  }),
}));

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

describe("useDismissGarment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useGeneratorStore.getState().resetFlow();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockInsert.mockResolvedValue({ error: null });
  });

  it("does nothing without alternatives", async () => {
    const current = buildGarment("t1", "top");
    useGeneratorStore.getState().setGarment("top", current);
    const { result } = renderHook(() => useDismissGarment());
    await result.current("top", [current]);
    expect(
      useGeneratorStore.getState().slots.top.garment?.garmentId,
    ).toBe("t1");
    expect(
      useGeneratorStore.getState().dismissedIds,
    ).not.toContain("t1");
  });

  it("swaps slot and records feedback", async () => {
    const current = buildGarment("t1", "top");
    const next = buildGarment("t2", "top");
    useGeneratorStore.getState().setGarment("top", current);
    const { result } = renderHook(() => useDismissGarment());
    await result.current("top", [current, next]);
    await waitFor(() =>
      expect(
        useGeneratorStore.getState().slots.top.garment?.garmentId,
      ).toBe("t2"),
    );
    expect(mockInsert).toHaveBeenCalled();
  });

  it("skips feedback for fallback garments", async () => {
    const current = buildGarment("t1", "top");
    const next = buildGarment("t2", "top");
    useGeneratorStore.getState().setGarment("top", current);
    useGeneratorStore.getState().setFallbackGarmentIds(["t1"]);
    const { result } = renderHook(() => useDismissGarment());
    await result.current("top", [current, next]);
    await waitFor(() =>
      expect(
        useGeneratorStore.getState().slots.top.garment?.garmentId,
      ).toBe("t2"),
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
