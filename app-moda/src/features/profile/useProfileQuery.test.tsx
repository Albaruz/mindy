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

import { useProfileQuery } from "./useProfileQuery";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("useProfileQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useProfileQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("maps profile row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              user_id: "u1",
              skin_tone: "light",
              eye_color: "brown",
              hair_color: "black",
              chest_measurement_cm: 90,
              waist_measurement_cm: 70,
              hip_measurement_cm: 90,
              colorimetry: "summer",
              morphology: "hourglass",
              preferred_fit: "regular",
              lifestyle: "casual_daily",
              extra_preferences: null,
              created_at: "2026-01-01",
            },
            error: null,
          }),
        }),
      }),
    });
    const { result } = renderHook(() => useProfileQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.userId).toBe("u1");
  });
});
