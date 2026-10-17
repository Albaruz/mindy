import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import type { Garment } from "@/types/garment";

const { mockGetUser, mockUpsert } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ upsert: mockUpsert }),
  }),
}));

import { usePlanTomorrow } from "./usePlanTomorrow";

function buildGarment(
  id: string,
  type: Garment["garmentType"],
): Garment {
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
    defaultOptions: { mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("usePlanTomorrow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("upserts one planned outfit for tomorrow so a later save replaces it", async () => {
    const { result } = renderHook(() => usePlanTomorrow(), {
      wrapper: createWrapper(),
    });
    const garments = [buildGarment("t1", "top")];

    result.current.mutate(garments);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        garment_ids: ["t1"],
        is_planned: true,
        planned_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      { onConflict: "user_id,planned_date" },
    );
  });
});
