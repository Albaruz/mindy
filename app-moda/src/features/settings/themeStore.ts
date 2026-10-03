import { create } from "zustand";

export const THEME_STORAGE_KEY = "mindy-theme-mode";

export type ThemeMode = "system" | "light" | "dark";

export const THEME_MODES: readonly ThemeMode[] = [
  "system",
  "light",
  "dark",
];

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

// System mode removes the pin so the OS media query decides.
export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === "undefined") {
    return;
  }
  if (mode === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", mode);
  }
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  mode: readStoredMode(),
  setMode: (mode) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Private mode: preference applies for the session only.
    }
    applyThemeMode(mode);
    set({ mode });
  },
}));
