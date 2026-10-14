import type {
  CutoutDifficulty,
  GarmentColor,
  GarmentCut,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";
import { CUTOUT_DIFFICULTY_VALUES } from "@/types/garment";
import { ANALYZE_TIMEOUT_MS } from "@/constants/validation";
import {
  normalizeGarmentColor,
  normalizeGarmentCut,
  normalizeGarmentMaterial,
  normalizeGarmentSeason,
  normalizeGarmentStyle,
  normalizeGarmentType,
} from "./garmentOptions";
import { API_ROUTES } from "@/constants/api";

export interface InferredTags {
  category: GarmentType | "";
  garmentType: GarmentType | "";
  season: GarmentSeason | "";
  color: GarmentColor | "";
  material: GarmentMaterial | "";
  style: GarmentStyle | "";
  cutLength: GarmentCut | "";
  typeDetail: string;
  colorShade: string;
  cutoutDifficulty: CutoutDifficulty | "";
  qualityNote: string;
  visualDescription: string;
}

export const EMPTY_TAGS: InferredTags = {
  category: "",
  garmentType: "",
  season: "",
  color: "",
  material: "",
  style: "",
  cutLength: "",
  typeDetail: "",
  colorShade: "",
  cutoutDifficulty: "",
  qualityNote: "",
  visualDescription: "",
};

function readClosedTag<T extends string>(
  value: unknown,
  normalize: (raw: unknown) => { base: T | null; detail: string | null },
): T | "" {
  const { base } = normalize(value);
  return base ?? "";
}

function readDetail(
  value: unknown,
  normalize: (raw: unknown) => { base: string | null; detail: string | null },
): string {
  const { detail } = normalize(value);
  return detail ?? "";
}

// Calls the vision endpoint and normalizes its payload into closed
// vocabulary tags. Any failure (network, timeout, malformed payload)
// resolves to EMPTY_TAGS so the flow can continue with manual input.
export async function suggestTags(
  imageBase64: string,
  locale: "en" | "es",
): Promise<InferredTags> {
  try {
    const response = await fetch(API_ROUTES.analyze, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, locale }),
      signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
    });
    if (!response.ok) {
      return EMPTY_TAGS;
    }
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return EMPTY_TAGS;
    }
    const record = payload as Record<string, unknown>;
    // Closed bases go to columns; shades/specific names fall back to
    // extra_tags via the normalizer (turquoise -> blue + shade).
    const typeValue = record.garmentType ?? record.type;
    const colorValue = record.color;
    return {
      category: readClosedTag(record.category, normalizeGarmentType),
      garmentType: readClosedTag(typeValue, normalizeGarmentType),
      season: readClosedTag(record.season, normalizeGarmentSeason),
      color: readClosedTag(colorValue, normalizeGarmentColor),
      material: readClosedTag(record.material, normalizeGarmentMaterial),
      style: readClosedTag(record.style, normalizeGarmentStyle),
      cutLength: readClosedTag(record.cutLength, normalizeGarmentCut),
      typeDetail:
        readDetail(record.typeDetail ?? record.specificType, normalizeGarmentType) ||
        readDetail(typeValue, normalizeGarmentType),
      colorShade:
        readDetail(record.colorDetail ?? record.shade, normalizeGarmentColor) ||
        readDetail(colorValue, normalizeGarmentColor),
      cutoutDifficulty:
        typeof record.cutoutDifficulty === "string" &&
        (CUTOUT_DIFFICULTY_VALUES as readonly string[]).includes(
          record.cutoutDifficulty,
        )
          ? (record.cutoutDifficulty as CutoutDifficulty)
          : "",
      qualityNote:
        typeof record.qualityNote === "string" ? record.qualityNote : "",
      visualDescription:
        typeof record.visualDescription === "string"
          ? record.visualDescription
          : "",
    };
  } catch {
    return EMPTY_TAGS;
  }
}
