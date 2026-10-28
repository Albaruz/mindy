import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

import { useHistoryQuery } from "@/features/history/hooks/queries/useHistoryQuery";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function garmentRow(id: string, type: string, dirty = true) {
  return {
    garment_id: id,
    user_id: "u1",
    image_url: null,
    garment_type: type,
    style: "casual",
    cut_length: null,
    color: "black",
    material: "cotton",
    season: "all",
    is_dirty: dirty,
    last_worn_date: null,
    is_external_garment: false,
    extra_tags: null,
    created_at: "2026-01-01",
  };
}

describe("useHistoryQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("joins history rows with garments", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === "outfit_history") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  {
                    look_id: "l1",
                    user_id: "u1",
                    garment_ids: ["g1"],
                    worn_date: "2026-01-01",
                    created_at: "2026-01-01",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          in: async () => ({
            data: [garmentRow("g1", "top", false)],
            error: null,
          }),
        }),
      };
    });
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].garments).toHaveLength(1);
  });
});
