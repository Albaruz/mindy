// Readers that turn the untrusted request body into the typed values the
// recommender works with. Nothing here trusts client input.
import { GARMENT_PRINT_VALUES } from "@/constants/garment";
import {
  COLORIMETRIES,
  EYE_COLORS,
  HAIR_COLORS,
  LIFESTYLES,
  MORPHOLOGIES,
  PREFERRED_FITS,
  SKIN_TONES,
} from "@/constants/profile";
import { OUTFIT_MOOD_VALUES, RECOMMENDER_MAX_REQUEST_GARMENTS } from "@/constants/generator";
import { DEFAULT_TEMPERATURE_C, WEATHER_CONDITION_VALUES } from "@/constants/weather";
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
import { isRecord } from "@/lib/readers";
import type {
  Garment,
  GarmentColor,
  GarmentPrint,
  GarmentSeason,
  GarmentStyle,
} from "@/types/garment";
import type { CandidateGarment } from "./types";

const SAFE_GARMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

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

function readExtraPrint(value: unknown): GarmentPrint | null {
  const raw = readExtraText(value, "print");
  if (raw === null) return null;
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
  return (GARMENT_PRINT_VALUES as readonly string[]).includes(normalized)
    ? (normalized as GarmentPrint)
    : null;
}

function readExtraSecondaryColor(value: unknown): GarmentColor | null {
  return readClosed(
    readExtraText(value, "secondary_color", "secondaryColor"),
    normalizeGarmentColor,
  );
}

export function toCandidate(raw: unknown): CandidateGarment | null {
  if (!isRecord(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = readString(
    record.garmentId ?? record.garment_id ?? record.id,
    64,
  );
  if (id === null || !SAFE_GARMENT_ID_PATTERN.test(id)) {
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
    print: readExtraPrint(extraTags),
    secondaryColor: readExtraSecondaryColor(extraTags),
    typeDetail: readExtraText(extraTags, "specificType", "typeDetail"),
    visualDescription: readExtraText(extraTags, "visualDescription"),
    season: readClosed(record.season, normalizeGarmentSeason),
    style: readClosed(record.style, normalizeGarmentStyle),
    styles: Array.isArray(record.styles)
      ? (record.styles as unknown[]).flatMap((value) => {
          const normalized = normalizeGarmentStyle(value).base;
          return normalized === null ? [] : [normalized];
        })
      : readClosed(record.style, normalizeGarmentStyle) === null
        ? []
        : [readClosed(record.style, normalizeGarmentStyle) as GarmentStyle],
    isDirty:
      record.isDirty === true || (record as Record<string, unknown>).is_dirty === true,
  };
}

export function readStylistProfile(value: unknown): StylistProfile | null {
  if (!isRecord(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const readAllowed = (candidate: unknown, allowed: readonly string[]) => {
    const text = readString(candidate)?.toLowerCase() ?? null;
    return text !== null && (allowed as readonly string[]).includes(text)
      ? text
      : null;
  };
  return {
    colorimetry: readAllowed(record.colorimetry, COLORIMETRIES),
    morphology: readAllowed(record.morphology, MORPHOLOGIES),
    preferredFit: readAllowed(
      record.preferredFit ?? record.preferred_fit,
      PREFERRED_FITS,
    ),
    lifestyle: readAllowed(record.lifestyle, LIFESTYLES),
    skinTone: readAllowed(record.skinTone ?? record.skin_tone, SKIN_TONES),
    eyeColor: readAllowed(record.eyeColor ?? record.eye_color, EYE_COLORS),
    hairColor: readAllowed(record.hairColor ?? record.hair_color, HAIR_COLORS),
  };
}

export function readWeatherCondition(value: unknown): string | null {
  const text = readString(value, 20);
  return text !== null &&
    (WEATHER_CONDITION_VALUES as readonly string[]).includes(text)
    ? text
    : null;
}

export function readOutfitMood(value: unknown): string | null {
  const text = readString(value, 20);
  return text !== null &&
    (OUTFIT_MOOD_VALUES as readonly string[]).includes(text)
    ? text
    : null;
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

export function readIdList(
  value: unknown,
  maxItems = RECOMMENDER_MAX_REQUEST_GARMENTS,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids: string[] = [];
  for (const entry of value) {
    const id = readString(entry, 64);
    if (id !== null && SAFE_GARMENT_ID_PATTERN.test(id)) {
      ids.push(id);
      if (ids.length >= maxItems) break;
    }
  }
  return ids;
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
    styles: candidate.styles,
    cuts: [],
    color: candidate.color,
    material: candidate.material,
    season: candidate.season as GarmentSeason | null,
    isDirty: candidate.isDirty,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {
      styles: candidate.styles,
      ...(candidate.typeDetail ? { specificType: candidate.typeDetail } : {}),
    },
    createdAt: "",
    isFavorite: false,
  };
}
