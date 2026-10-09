import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

const { mockGetUser, mockDelete, mockRemove } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockDelete: vi.fn(),
  mockRemove: vi.fn(async () => ({})),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ delete: mockDelete }),
    storage: { from: () => ({ remove: mockRemove }) },
  }),
}));

import { useDeleteGarment } from "./useDeleteGarment";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("useDeleteGarment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useDeleteGarment(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ garmentId: "g1", imageUrl: null });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("deletes row and storage file", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = { eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
    mockDelete.mockReturnValue(chain);
    const { result } = renderHook(() => useDeleteGarment(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      garmentId: "g1",
      imageUrl: "https://x.supabase.co/storage/v1/object/public/garments/u1/a.png",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRemove).toHaveBeenCalled();
  });

  it("skips storage removal without bucket path", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = { eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
    mockDelete.mockReturnValue(chain);
    const { result } = renderHook(() => useDeleteGarment(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ garmentId: "g1", imageUrl: null });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
