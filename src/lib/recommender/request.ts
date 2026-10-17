// Readers that turn the untrusted request body into the typed values the
// recommender works with. Nothing here trusts client input.
import { DEFAULT_TEMPERATURE_C } from "@/constants/weather";
import { type StylistProfile } from "@/lib/ai/prompts";
import { resolvePreferredLocale } from "@/lib/negotiateLocale";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  normalizeGarmentColor,
  normalizeGarmentMaterial,
  normalizeGarmentSeason,
  normalizeGarmentStyle,
  normalizeGarmentType,
} from "@/lib/garment/normalizers";
import { readString } from "@/lib/readers";
import type { Garment, GarmentSeason } from "@/types/garment";
import type { CandidateGarment } from "./types";
function readClosed<T extends string>(
  value: unknown,
  normalize: (raw: unknown) => { base: T | null },
): T | null {
  if (typeof value !== "string" || value === "") {
    return null;
  }
  return normalize(value).base;
}

function readBaseColor(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const tags = value as Record<string, unknown>;
  const raw = tags.color_base ?? tags.colorBase;
  if (typeof raw !== "string" || raw.trim() === "") {
    return null;
  }
  return raw.trim().toLowerCase();
}

function readMaterialDetail(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const tags = value as Record<string, unknown>;
  const raw =
    tags.materialDetail ?? tags.material_detail ?? tags.specificType ?? tags.specific_type;
  if (typeof raw !== "string" || raw.trim() === "") {
    return null;
  }
  return raw.trim();
}

function readExtraText(value: unknown, ...keys: string[]): string | null {
  if (typeof value !== "object" || value === null) return null;
  const tags = value as Record<string, unknown>;
  for (const key of keys) {
    const raw = tags[key];
    if (typeof raw === "string" && raw.trim() !== "") {
      return raw.trim().slice(0, 400);
    }
  }
  return null;
}

export function toCandidate(raw: unknown): CandidateGarment | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = readString(
    record.garmentId ?? record.garment_id ?? record.id,
  );
  if (id === null) {
    return null;
  }
  const extraTags = record.extraTags ?? record.extra_tags;
  return {
    id,
    garmentType: readClosed(
      record.garmentType ?? record.garment_type,
      normalizeGarmentType,
    ),
    color: readClosed(record.color, normalizeGarmentColor),
    colorBase: readBaseColor(
      extraTags,
    ),
    material: readClosed(record.material, normalizeGarmentMaterial),
    materialDetail: readMaterialDetail(
      extraTags,
    ),
    typeDetail: readExtraText(extraTags, "specificType", "typeDetail"),
    visualDescription: readExtraText(extraTags, "visualDescription"),
    season: readClosed(record.season, normalizeGarmentSeason),
    style: readClosed(record.style, normalizeGarmentStyle),
    isDirty:
      record.isDirty === true || (record as Record<string, unknown>).is_dirty === true,
  };
}

export function readStylistProfile(value: unknown): StylistProfile | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    colorimetry: readString(record.colorimetry),
    morphology: readString(record.morphology),
    preferredFit: readString(
      record.preferredFit ?? record.preferred_fit,
    ),
    lifestyle: readString(record.lifestyle),
    skinTone: readString(record.skinTone ?? record.skin_tone),
    eyeColor: readString(record.eyeColor ?? record.eye_color),
    hairColor: readString(record.hairColor ?? record.hair_color),
  };
}

export function readTemperatureCelsius(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : DEFAULT_TEMPERATURE_C;
}

export function readOptionalProbability(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function readIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry !== "",
  );
}

// Client sends its active next-intl locale in the body (the URL locale is
// the source of truth). Fallback: NEXT_LOCALE cookie, then Accept-Language,
// then the default. Unknown values never reach the prompt.
// Accepts the `language` alias for forward compatibility.
export function readLocale(
  value: unknown,
  request: Request,
): AppLocale {
  if (typeof value === "string" && routing.locales.includes(value as AppLocale)) {
    return value as AppLocale;
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieValue = cookieHeader
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === "NEXT_LOCALE")?.[1];
  return resolvePreferredLocale({
    cookieValue: cookieValue ?? null,
    acceptLanguage: request.headers.get("accept-language"),
  });
}

// Adapt the minimized candidate to the shared classifier so server and
// client categorize garments with the same rules.
export function toClassifiableGarment(candidate: CandidateGarment): Garment {
  return {
    garmentId: candidate.id,
    userId: "",
    imageUrl: null,
    garmentType: candidate.garmentType,
    style: candidate.style,
    cutLength: null,
    color: candidate.color,
    material: candidate.material,
    season: candidate.season as GarmentSeason | null,
    isDirty: candidate.isDirty,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "",
  };
}
