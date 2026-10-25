import { beforeEach, describe, expect, it } from "vitest";
import {
  THEME_MODES,
  THEME_STORAGE_KEY,
  applyThemeMode,
  useThemeStore,
} from "@/features/settings/state/theme-store/themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    useThemeStore.setState({ mode: "system" });
  });

  it("lists the three supported modes", () => {
    expect([...THEME_MODES]).toEqual(["system", "light", "dark"]);
  });

  it("pins data-theme for light and dark, unpins for system", () => {
    applyThemeMode("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    applyThemeMode("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    applyThemeMode("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("persists the mode to localStorage via the storage key", () => {
    useThemeStore.getState().setMode("dark");
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("clears the pinned theme when switching back to system", () => {
    useThemeStore.getState().setMode("light");
    useThemeStore.getState().setMode("system");
    expect(useThemeStore.getState().mode).toBe("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
