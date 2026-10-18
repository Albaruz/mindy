// Garment types mirroring the public.garments table.
// Database uses snake_case; TypeScript uses camelCase properties.
//
// Closed vocabularies live in @/constants/garment; unions are derived here.
// Fine-grained values (e.g. "sneakers", "turquoise") map to their base value and
// the original detail is preserved in extra_tags (specificType, colorShade, ...).

import type {
  CUTOUT_DIFFICULTY_VALUES,
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
} from "@/constants/garment";

export type GarmentType = (typeof GARMENT_TYPE_VALUES)[number];
export type GarmentStyle = (typeof GARMENT_STYLE_VALUES)[number];
export type GarmentCut = (typeof GARMENT_CUT_VALUES)[number];
export type GarmentColor = (typeof GARMENT_COLOR_VALUES)[number];
export type GarmentMaterial = (typeof GARMENT_MATERIAL_VALUES)[number];
export type GarmentSeason = (typeof GARMENT_SEASON_VALUES)[number];
/** Vision's assessment of how difficult a clean garment cutout will be. */
export type CutoutDifficulty = (typeof CUTOUT_DIFFICULTY_VALUES)[number];

/** Normalized tags returned by the vision analysis endpoint. */
export interface InferredTags {
  category: GarmentType | "";
  garmentType: GarmentType | "";
  season: GarmentSeason | "";
  color: GarmentColor | "";
  material: GarmentMaterial | "";
  style: GarmentStyle | "";
  cutLength: GarmentCut | "";
  styles?: GarmentStyle[];
  cuts?: GarmentCut[];
  typeDetail: string;
  colorShade: string;
  secondaryColor: string;
  print: string;
  cutoutDifficulty: CutoutDifficulty | "";
  qualityNote: string;
  visualDescription: string;
}

// Detail keys stored inside extra_tags when the original value is more
// specific than the closed base (sneakers -> footwear, turquoise -> blue).
export interface GarmentExtraTags {
  aiCategory?: string;
  specificType?: string;
  colorShade?: string;
  secondary_color?: string;
  print?: string;
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
  styles: GarmentStyle[];
  cuts: GarmentCut[];
  color: GarmentColor | null;
  material: GarmentMaterial | null;
  season: GarmentSeason | null;
  isDirty: boolean;
  lastWornDate: string | null;
  isExternalGarment: boolean;
  extraTags: GarmentExtraTags;
  createdAt: string;
}

// Generator slot / carousel category: the macro group a garment belongs to
// (a dress covers top + bottom, see lib/garment/categorizeGarments).
export type Category = "top" | "bottom" | "footwear" | "outerwear";
