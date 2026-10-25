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

vi.mock("@/features/settings/state/theme-store/themeStore", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/settings/state/theme-store/themeStore")>();
  return { ...actual, applyThemeMode: mockApplyTheme };
});

import { Providers } from "./providers";
import { useThemeStore } from "@/features/settings/state/theme-store/themeStore";

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
});
