import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

import { useUploadGarment } from "./useUploadGarment";
import { useNotificationStore } from "@/features/ui/useNotificationStore";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("useUploadGarment validation", () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it("rejects non-image files", async () => {
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await result.current.processPhoto(file);
    await waitFor(() =>
      expect(
        useNotificationStore.getState().notifications,
      ).toHaveLength(1),
    );
    expect(result.current.phase).toBe("idle");
  });

  it("rejects oversized files", async () => {
    const { result } = renderHook(() => useUploadGarment(), {
      wrapper: createWrapper(),
    });
    const big = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    await result.current.processPhoto(big);
    await waitFor(() =>
      expect(
        useNotificationStore.getState().notifications,
      ).toHaveLength(1),
    );
  });
});
