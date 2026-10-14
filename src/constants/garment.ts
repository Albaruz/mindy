// Closed vocabularies for garment tags (single source of truth).
// Types are derived in @/types/garment. Fine-grained values map to these
// base values; see features/closet/garmentOptions.ts for normalization.

export const GARMENT_TYPE_VALUES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
] as const;

export const GARMENT_STYLE_VALUES = [
  "casual",
  "formal",
  "sport",
  "elegant",
  "streetwear",
  "party",
] as const;

export const GARMENT_CUT_VALUES = [
  "slim",
  "regular",
  "relaxed",
  "oversized",
  "cropped",
  "long",
] as const;

export const GARMENT_COLOR_VALUES = [
  "black",
  "white",
  "gray",
  "beige",
  "brown",
  "navy",
  "blue",
  "red",
  "pink",
  "green",
  "yellow",
  "orange",
  "purple",
] as const;

export const GARMENT_MATERIAL_VALUES = [
  "cotton",
  "denim",
  "linen",
  "wool",
  "leather",
  "silk",
  "polyester",
  "viscose",
  "nylon",
  "elastane",
  "corduroy",
  "knit",
] as const;

export const GARMENT_SEASON_VALUES = [
  "summer",
  "winter",
  "mid_season",
  "all",
] as const;

/** Vision's assessment of how difficult a clean garment cutout will be. */
export const CUTOUT_DIFFICULTY_VALUES = ["easy", "hard"] as const;
