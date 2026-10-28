import type {
  GarmentColor,
  GarmentCut,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";

/** Editable values owned by the closet garment form. */
export interface GarmentFormInput {
  garmentType: GarmentType | "";
  season: GarmentSeason | "";
  color: GarmentColor | "";
  material: GarmentMaterial | "";
  style: GarmentStyle | "";
  cutLength: GarmentCut | "";
  styles?: GarmentStyle[];
  cuts?: GarmentCut[];
  // Free-form extra tags edited as chips (aiCategory, color_base, ...).
  extraTags: Record<string, string>;
}
