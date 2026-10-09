import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

const { mockGetUser, mockUpdate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ update: mockUpdate }),
  }),
}));

import { useWashGarment } from "@/features/closet/useWashGarment";
import { useDoLaundry } from "@/features/profile/useDoLaundry";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("useWashGarment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("washes owned garment", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = { eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
    mockUpdate.mockReturnValue(chain);
    const { result } = renderHook(() => useWashGarment(), {
      wrapper: createWrapper(),
    });
    result.current.mutate("g1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("throws without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useWashGarment(), {
      wrapper: createWrapper(),
    });
    result.current.mutate("g1");
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useDoLaundry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("marks all dirty garments clean", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = { eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
    mockUpdate.mockReturnValue(chain);
    const { result } = renderHook(() => useDoLaundry(), {
      wrapper: createWrapper(),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
