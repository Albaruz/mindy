// Fixed option sets for the onboarding wizard. Preferred fits and
// lifestyles mirror the database CHECK constraints on profiles.
export const SKIN_TONES = [
  "fair",
  "light",
  "medium",
  "olive",
  "brown",
  "deep",
] as const;

export const EYE_COLORS = [
  "brown",
  "hazel",
  "green",
  "blue",
  "gray",
  "black",
] as const;

export const HAIR_COLORS = [
  "black",
  "brown",
  "blonde",
  "red",
  "gray",
  "white",
] as const;

// Hex swatches for the color picker circles in the onboarding wizard.
export const SKIN_TONE_SWATCHES: Record<string, string> = {
  fair: "#fdebd7",
  light: "#f5d0a9",
  medium: "#e0ac69",
  olive: "#9c7b4f",
  brown: "#6b4423",
  deep: "#3b2213",
};

export const EYE_COLOR_SWATCHES: Record<string, string> = {
  brown: "#5c3a21",
  hazel: "#7a5c2e",
  green: "#4a7c59",
  blue: "#4a7ebb",
  gray: "#8e9aaf",
  black: "#1c1c1e",
};

export const HAIR_COLOR_SWATCHES: Record<string, string> = {
  black: "#1a1a1a",
  brown: "#4e3320",
  blonde: "#d9b36a",
  red: "#b5522b",
  gray: "#9aa0a6",
  white: "#f5f0e8",
};

export const PREFERRED_FITS = [
  "slim",
  "regular",
  "oversized",
  "mixed",
] as const;

export const LIFESTYLES = [
  "casual_daily",
  "corporate_office",
  "active_sports",
  "home_remote",
  "social_events",
] as const;
