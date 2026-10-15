// Normalization of free/AI text to the closed garment vocabularies
// (constants/garment.ts): a base value plus the original detail, which
// callers keep in extra_tags. Shared by the closet, the generator and the
// recommender route.
import {
  GARMENT_COLOR_VALUES,
  GARMENT_CUT_VALUES,
  GARMENT_MATERIAL_VALUES,
  GARMENT_SEASON_VALUES,
  GARMENT_STYLE_VALUES,
  GARMENT_TYPE_VALUES,
  GARMENT_COLOR_ALIASES as COLOR_ALIASES,
  GARMENT_CUT_ALIASES as CUT_ALIASES,
  GARMENT_MATERIAL_ALIASES as MATERIAL_ALIASES,
  GARMENT_STYLE_ALIASES as STYLE_ALIASES,
  GARMENT_TYPE_ALIASES as TYPE_ALIASES,
} from "@/constants/garment";
import type {
  GarmentColor,
  GarmentCut,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";
// Normalize free text: lowercase, strip accents, trim.
function clean(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isBase<T extends string>(
  value: string,
  bases: readonly T[],
): value is T {
  return (bases as readonly string[]).includes(value);
}

// Normalized result: base value plus the original detail (stored in
// extra_tags). Alias tables live in constants/garment.ts (single source).
export interface NormalizedTag<T extends string> {
  base: T | null;
  // Original detail when it differs from the base (stored in extra_tags).
  detail: string | null;
}

function normalizeWithAliases<T extends string>(
  raw: unknown,
  bases: readonly T[],
  aliases: Record<string, T>,
): NormalizedTag<T> {
  if (typeof raw !== "string") {
    return { base: null, detail: null };
  }
  const cleaned = clean(raw);
  if (cleaned === "") {
    return { base: null, detail: null };
  }
  if (isBase(cleaned, bases)) {
    return { base: cleaned, detail: null };
  }
  const base = aliases[cleaned];
  if (base !== undefined) {
    return { base, detail: cleaned === base ? null : cleaned };
  }
  return { base: null, detail: cleaned };
}

export function normalizeGarmentType(
  raw: unknown,
): NormalizedTag<GarmentType> {
  return normalizeWithAliases(raw, GARMENT_TYPE_VALUES, TYPE_ALIASES);
}

export function normalizeGarmentColor(
  raw: unknown,
): NormalizedTag<GarmentColor> {
  return normalizeWithAliases(raw, GARMENT_COLOR_VALUES, COLOR_ALIASES);
}

export function normalizeGarmentMaterial(
  raw: unknown,
): NormalizedTag<GarmentMaterial> {
  return normalizeWithAliases(
    raw,
    GARMENT_MATERIAL_VALUES,
    MATERIAL_ALIASES,
  );
}

export function normalizeGarmentStyle(
  raw: unknown,
): NormalizedTag<GarmentStyle> {
  return normalizeWithAliases(raw, GARMENT_STYLE_VALUES, STYLE_ALIASES);
}

export function normalizeGarmentCut(raw: unknown): NormalizedTag<GarmentCut> {
  return normalizeWithAliases(raw, GARMENT_CUT_VALUES, CUT_ALIASES);
}

export function normalizeGarmentSeason(
  raw: unknown,
): NormalizedTag<GarmentSeason> {
  if (typeof raw !== "string") {
    return { base: null, detail: null };
  }
  const cleaned = clean(raw);
  if (isBase(cleaned, GARMENT_SEASON_VALUES)) {
    return { base: cleaned, detail: null };
  }
  return { base: null, detail: null };
}
