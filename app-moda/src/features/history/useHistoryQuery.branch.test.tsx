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

import { useHistoryQuery } from "./useHistoryQuery";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

describe("useHistoryQuery branch coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns an empty list without a session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("propagates history fetch errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-one" } } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: null, error: new Error("history failed") }),
        }),
      }),
    });
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("returns entries with empty garments when no garment ids exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-one" } } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [
              {
                look_id: "look-one",
                user_id: "user-one",
                garment_ids: null,
                worn_date: "2026-01-01",
                created_at: "2026-01-01",
              },
            ],
            error: null,
          }),
        }),
      }),
    });
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].garments).toEqual([]);
  });

  it("propagates garment join errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-one" } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === "outfit_history") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  {
                    look_id: "look-one",
                    user_id: "user-one",
                    garment_ids: ["g-one"],
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
          in: async () => ({ data: null, error: new Error("join failed") }),
        }),
      };
    });
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("drops missing garments from the join", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-one" } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === "outfit_history") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  {
                    look_id: "look-one",
                    user_id: "user-one",
                    garment_ids: ["missing-one"],
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
          in: async () => ({ data: [], error: null }),
        }),
      };
    });
    const { result } = renderHook(() => useHistoryQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].garments).toEqual([]);
  });
});
