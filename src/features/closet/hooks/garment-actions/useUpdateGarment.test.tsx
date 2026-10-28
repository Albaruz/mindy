import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

const { mockGetUser, mockUpdate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ update: mockUpdate }),
  }),
}));

import { useUpdateGarment } from "./useUpdateGarment";
import type { GarmentFormInput } from "../../domain/garments/garmentForm";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function buildInput(): GarmentFormInput {
  return {
    garmentType: "top",
    season: "all",
    color: "black",
    material: "cotton",
    style: "casual",
    cutLength: "",
    extraTags: {},
  };
}

describe("useUpdateGarment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useUpdateGarment(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ garmentId: "g1", input: buildInput() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("updates owned garment", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = { eq: vi.fn(async () => ({ error: null })) };
    mockUpdate.mockReturnValue({ eq: () => chain });
    const { result } = renderHook(() => useUpdateGarment(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ garmentId: "g1", input: buildInput() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
