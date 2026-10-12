// Garment types mirroring the public.garments table.
// Database uses snake_case; TypeScript uses camelCase properties.
//
// Closed vocabularies: every tag column stores ONLY one of the values
// below (or null). Fine-grained values (e.g. "sneakers", "turquoise")
// map to their base spectrum value, and the original detail is preserved
// in extra_tags (specificType, colorShade, ...). See
// features/closet/garmentOptions.ts for the normalization maps.

export const GARMENT_TYPE_VALUES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
] as const;
export type GarmentType = (typeof GARMENT_TYPE_VALUES)[number];

export const GARMENT_STYLE_VALUES = [
  "casual",
  "formal",
  "sport",
  "elegant",
  "streetwear",
  "party",
] as const;
export type GarmentStyle = (typeof GARMENT_STYLE_VALUES)[number];

export const GARMENT_CUT_VALUES = [
  "slim",
  "regular",
  "relaxed",
  "oversized",
  "cropped",
  "long",
] as const;
export type GarmentCut = (typeof GARMENT_CUT_VALUES)[number];

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
export type GarmentColor = (typeof GARMENT_COLOR_VALUES)[number];

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
export type GarmentMaterial = (typeof GARMENT_MATERIAL_VALUES)[number];

export const GARMENT_SEASON_VALUES = [
  "summer",
  "winter",
  "mid_season",
  "all",
] as const;
export type GarmentSeason = (typeof GARMENT_SEASON_VALUES)[number];

/** Vision's assessment of how difficult a clean garment cutout will be. */
export const CUTOUT_DIFFICULTY_VALUES = ["easy", "hard"] as const;
export type CutoutDifficulty = (typeof CUTOUT_DIFFICULTY_VALUES)[number];

// Detail keys stored inside extra_tags when the original value is more
// specific than the closed base (sneakers -> footwear, turquoise -> blue).
export interface GarmentExtraTags {
  aiCategory?: string;
  specificType?: string;
  colorShade?: string;
  materialDetail?: string;
  styleDetail?: string;
  cutDetail?: string;
  color_base?: string;
  colorBase?: string;
  [key: string]: unknown;
}

export interface Garment {
  garmentId: string;
  userId: string;
  imageUrl: string | null;
  garmentType: GarmentType | null;
  style: GarmentStyle | null;
  cutLength: GarmentCut | null;
  color: GarmentColor | null;
  material: GarmentMaterial | null;
  season: GarmentSeason | null;
  isDirty: boolean;
  lastWornDate: string | null;
  isExternalGarment: boolean;
  extraTags: GarmentExtraTags;
  createdAt: string;
}
