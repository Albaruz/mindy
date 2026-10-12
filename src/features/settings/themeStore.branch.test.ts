import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, applyThemeMode, useThemeStore } from "./themeStore";

describe("themeStore branch coverage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    useThemeStore.setState({ mode: "system" });
  });

  it("hydrates a stored light mode", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().mode).toBe("light");
  });

  it("hydrates a stored dark mode", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().mode).toBe("dark");
  });

  it("falls back to system for unknown stored values", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "neon");
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().mode).toBe("system");
  });

  it("falls back to system when nothing is stored", () => {
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().mode).toBe("system");
  });

  it("applies the session-only mode when storage throws", () => {
    const setItem = vi.spyOn(window.Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    try {
      useThemeStore.getState().setMode("dark");
    } finally {
      setItem.mockRestore();
    }
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("keeps system mode when storage throws", () => {
    const setItem = vi.spyOn(window.Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    try {
      useThemeStore.getState().setMode("system");
    } finally {
      setItem.mockRestore();
    }
    expect(useThemeStore.getState().mode).toBe("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("ignores invalid stored values in readStoredMode", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "");
    applyThemeMode("system");
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().mode).toBe("system");
  });
});
