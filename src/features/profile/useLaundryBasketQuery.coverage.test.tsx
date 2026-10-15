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

import { useLaundryBasketQuery } from "./useLaundryBasketQuery";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

describe("useLaundryBasketQuery branch coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns an empty basket without a session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useLaundryBasketQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("propagates query errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-one" } } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: async () => ({ data: null, error: new Error("basket failed") }),
          }),
        }),
      }),
    });
    const { result } = renderHook(() => useLaundryBasketQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
