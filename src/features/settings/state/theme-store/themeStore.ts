import { create } from "zustand";
import { THEME_STORAGE_KEY } from "@/constants/storage";
import type { ThemeMode } from "@/types/ui";

// Browser persistence key. Re-exported from centralized constants for
// backward compatibility (layout inline script + settings UI).
export { THEME_STORAGE_KEY };

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
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  mode: "system", // Consistent SSR value - avoid hydration mismatch
  setMode: (mode) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Private mode: preference applies for the session only.
    }
    applyThemeMode(mode);
    set({ mode });
  },
  hydrate: () => {
    if (typeof window !== "undefined") {
      set({ mode: readStoredMode() });
    }
  },
}));
