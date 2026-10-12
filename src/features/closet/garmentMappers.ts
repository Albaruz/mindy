import type {
  Garment,
  GarmentColor,
  GarmentCut,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";

// Row shape of public.garments (snake_case, as returned by Supabase).
// Columns use the same closed vocabularies as the Garment interface.
export interface GarmentRow {
  garment_id: string;
  user_id: string;
  image_url: string | null;
  garment_type: GarmentType | null;
  style: GarmentStyle | null;
  cut_length: GarmentCut | null;
  color: GarmentColor | null;
  material: GarmentMaterial | null;
  season: GarmentSeason | null;
  is_dirty: boolean;
  last_worn_date: string | null;
  is_external_garment: boolean;
  extra_tags: Record<string, unknown> | null;
  created_at: string;
}

export function toGarment(row: GarmentRow): Garment {
  return {
    garmentId: row.garment_id,
    userId: row.user_id,
    imageUrl: row.image_url,
    garmentType: row.garment_type,
    style: row.style,
    cutLength: row.cut_length,
    color: row.color,
    material: row.material,
    season: row.season,
    isDirty: row.is_dirty,
    lastWornDate: row.last_worn_date,
    isExternalGarment: row.is_external_garment,
    extraTags: row.extra_tags ?? {},
    createdAt: row.created_at,
  };
}

// Vision-tagged values (closed columns plus free-form details) as
// produced by the /api/analyze pipeline.
export interface VisionTags {
  category: GarmentType | "";
  color: GarmentColor | "";
  typeDetail: string;
  colorShade: string;
}

// Builds the extra_tags payload for a vision-tagged insert. color_base
// mirrors the closed color column: the vision prompt already constrains
// "color" to the base spectrum, so deriving it deterministically keeps
// the closed vocabulary guaranteed (no extra LLM field needed).
// Readers (recommender fallback, search, future similarity) consume
// extra_tags.color_base.
export function buildVisionExtraTags(tags: VisionTags): Record<string, string> {
  return {
    ...(tags.category === "" ? {} : { aiCategory: tags.category }),
    ...(tags.typeDetail === "" ? {} : { specificType: tags.typeDetail }),
    ...(tags.colorShade === "" ? {} : { colorShade: tags.colorShade }),
    ...(tags.color === "" ? {} : { color_base: tags.color }),
  };
}
