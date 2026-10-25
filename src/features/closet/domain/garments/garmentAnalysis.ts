import type {
  CutoutDifficulty,
  InferredTags,
} from "@/types/garment";
import { CUTOUT_DIFFICULTY_VALUES } from "@/constants/garment";
import { ANALYZE_TIMEOUT_MS } from "@/constants/validation";
import {
  normalizeGarmentColor,
  normalizeGarmentCut,
  normalizeGarmentMaterial,
  normalizeGarmentSeason,
  normalizeGarmentStyle,
  normalizeGarmentType,
} from "@/lib/garment/normalizers";
import { API_ROUTES } from "@/constants/api";

export type { InferredTags } from "@/types/garment";

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
  secondaryColor: "",
  print: "",
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
  options?: { throwOnError?: boolean },
): Promise<InferredTags> {
  const throwOnError = options?.throwOnError === true;
  try {
    const response = await fetch(API_ROUTES.analyze, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, locale }),
      signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
    });
    if (!response.ok) {
      if (throwOnError) {
        throw new Error(`Vision analysis failed with status ${response.status}.`);
      }
      return EMPTY_TAGS;
    }
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      if (throwOnError) {
        throw new Error("Vision analysis returned an invalid response.");
      }
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
      styles: Array.isArray(record.styles)
        ? record.styles.filter((value): value is NonNullable<InferredTags["styles"]>[number] => normalizeGarmentStyle(value).base !== null)
        : [],
      cutLength: readClosedTag(record.cutLength, normalizeGarmentCut),
      cuts: Array.isArray(record.cuts)
        ? record.cuts.filter((value): value is NonNullable<InferredTags["cuts"]>[number] => normalizeGarmentCut(value).base !== null)
        : [],
      typeDetail:
        readDetail(record.typeDetail ?? record.specificType, normalizeGarmentType) ||
        readDetail(typeValue, normalizeGarmentType),
      colorShade:
        readDetail(record.colorDetail ?? record.shade, normalizeGarmentColor) ||
        readDetail(colorValue, normalizeGarmentColor),
      secondaryColor:
        typeof record.secondaryColor === "string" ? record.secondaryColor.trim() : "",
      print: typeof record.print === "string" ? record.print.trim() : "",
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
  } catch (error) {
    if (throwOnError) {
      throw error instanceof Error ? error : new Error("Vision analysis failed.");
    }
    return EMPTY_TAGS;
  }
}
