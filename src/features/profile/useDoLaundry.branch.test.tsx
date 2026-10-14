import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

const { mockGetUser, mockUpdate, mockEqUser, mockEqDirty } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdate: vi.fn(),
  mockEqUser: vi.fn(),
  mockEqDirty: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ update: mockUpdate }),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { useDoLaundry } from "./useDoLaundry";
import { useNotificationStore } from "@/stores/useNotificationStore";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

describe("useDoLaundry branch coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useNotificationStore.setState({ notifications: [] });
  });

  it("marks dirty garments clean on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-one" } } });
    mockEqDirty.mockResolvedValue({ error: null });
    mockEqUser.mockReturnValue({ eq: mockEqDirty });
    mockUpdate.mockReturnValue({ eq: mockEqUser });
    const { result } = renderHook(() => useDoLaundry(), { wrapper: createWrapper() });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith({ is_dirty: false });
  });

  it("rejects when no user is signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useDoLaundry(), { wrapper: createWrapper() });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(String(result.current.error)).toContain("signed in");
  });

  it("rejects when the update returns an error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-one" } } });
    mockEqDirty.mockResolvedValue({ error: new Error("update failed") });
    mockEqUser.mockReturnValue({ eq: mockEqDirty });
    mockUpdate.mockReturnValue({ eq: mockEqUser });
    const { result } = renderHook(() => useDoLaundry(), { wrapper: createWrapper() });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("shows an error notification on failure", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-one" } } });
    mockEqDirty.mockResolvedValue({ error: new Error("update failed") });
    mockEqUser.mockReturnValue({ eq: mockEqDirty });
    mockUpdate.mockReturnValue({ eq: mockEqUser });
    const { result } = renderHook(() => useDoLaundry(), { wrapper: createWrapper() });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() =>
      expect(useNotificationStore.getState().notifications.length).toBeGreaterThan(0),
    );
  });
});
