// UI-level unions shared across components, stores and features.

export type ThemeMode = "system" | "light" | "dark";

export type NotificationType = "success" | "error" | "info";

// Stable filter keys: labels translate, keys drive the taxonomy prefilter
// (see searchGarments). Never use display text as filter state.
export type CategoryFilter =
  | "all"
  | "tops"
  | "bottoms"
  | "shoes"
  | "outerwear";