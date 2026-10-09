import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { mockGet, mockSet, mockDel, mockApplyTheme } = vi.hoisted(() => ({
  mockGet: vi.fn(async () => undefined),
  mockSet: vi.fn(async () => undefined),
  mockDel: vi.fn(async () => undefined),
  mockApplyTheme: vi.fn(),
}));

vi.mock("idb-keyval", () => ({
  get: mockGet,
  set: mockSet,
  del: mockDel,
}));

vi.mock("@/features/settings/themeStore", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/settings/themeStore")>();
  return { ...actual, applyThemeMode: mockApplyTheme };
});

import { Providers, PERSISTED_CACHE_KEY } from "./providers";
import { useThemeStore } from "@/features/settings/themeStore";

describe("Providers offline persistence", () => {
  it("renders children and applies the stored theme", async () => {
    useThemeStore.setState({ mode: "dark" } as never);
    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
    await waitFor(() => expect(mockApplyTheme).toHaveBeenCalled());
  });

  it("exposes the persisted cache key", () => {
    expect(typeof PERSISTED_CACHE_KEY).toBe("string");
    expect(PERSISTED_CACHE_KEY.length).toBeGreaterThan(0);
  });
});
