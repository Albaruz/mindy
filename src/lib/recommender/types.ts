import type {
  GarmentColor,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";

// Minimized garment sent to the LLM and used by the server-side rules.
export interface CandidateGarment {
  id: string;
  garmentType: GarmentType | null;
  color: GarmentColor | null;
  // Generic base color (red for burgundy) used by the fallback lifesaver
  // rule. Read from extra_tags; null when the closet never set it.
  colorBase: string | null;
  material: GarmentMaterial | null;
  // Free-text material detail (suede/gamuza/ante) for the rain rule: suede
  // has no closed value, so the closed material column cannot catch it.
  materialDetail: string | null;
  season: GarmentSeason | null;
  style: GarmentStyle | null;
  isDirty: boolean;
}

export interface OutfitOption {
  garmentIds: string[];
  suitabilityRatio: number;
  reason: string;
}
