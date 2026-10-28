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

import {
  useWashAllGarments,
  useWashGarment,
} from "@/lib/garment/useLaundryMutation";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function makeUpdateBuilder() {
  const finalQuery = {
    in: vi.fn(async () => ({ error: null })),
    then: (resolve: (value: { error: null }) => unknown) =>
      Promise.resolve({ error: null }).then(resolve),
  };
  return {
    eq: vi.fn(() => ({ eq: vi.fn(() => finalQuery) })),
  };
}

describe("useWashGarment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("washes owned garment", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockUpdate.mockReturnValue(makeUpdateBuilder());
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

describe("useWashAllGarments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("marks all dirty garments clean", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockUpdate.mockReturnValue(makeUpdateBuilder());
    const { result } = renderHook(() => useWashAllGarments(), {
      wrapper: createWrapper(),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
