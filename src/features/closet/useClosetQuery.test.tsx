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

import { useClosetQuery } from "./useClosetQuery";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client },
      children,
    );
  };
}

describe("useClosetQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty array without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useClosetQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("maps rows to garments", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [
              {
                garment_id: "g1",
                user_id: "u1",
                image_url: null,
                garment_type: "top",
                style: "casual",
                cut_length: null,
                color: "black",
                material: "cotton",
                season: "all",
                is_dirty: false,
                last_worn_date: null,
                is_external_garment: false,
                extra_tags: null,
                created_at: "2026-01-01",
              },
            ],
            error: null,
          }),
        }),
      }),
    });
    const { result } = renderHook(() => useClosetQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].garmentId).toBe("g1");
  });
});
