import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { RATE_LIMITS, RETRY_AFTER_HEADER } from "@/constants/api";
import { logger, generateRequestId } from "@/lib/logger";
import {
  COLD_THRESHOLD_C,
  DEFAULT_TEMPERATURE_C,
  HEAT_THRESHOLD_C,
  RAIN_EXPECTED_THRESHOLD,
  RAINY_CONDITIONS,
  isRainVulnerableMaterial,
} from "@/constants/weather";
import {
  buildOutfitPrompt,
  type StylistProfile,
} from "@/lib/ai/prompts";
import { resolvePreferredLocale } from "@/lib/negotiateLocale";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  generateOutfitRecommendation,
  getEngineModel,
} from "@/lib/ai/engine";
import {
  categorizeGarment,
  isOnePieceGarment,
} from "@/features/generator/categorizeGarments";
import type {
  Garment,
  GarmentColor,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";
import {
  normalizeGarmentColor,
  normalizeGarmentMaterial,
  normalizeGarmentSeason,
  normalizeGarmentStyle,
  normalizeGarmentType,
} from "@/features/closet/garmentOptions";

const MAX_GARMENTS = 60;
const MAX_PER_CATEGORY = 15;

interface CandidateGarment {
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

interface OutfitOption {
  garmentIds: string[];
  suitabilityRatio: number;
  reason: string;
}

function readOptionalString(value: unknown, maxLength = 200): string | null {
  if (typeof value !== "string" || value === "") {
    return null;
  }
  return value.slice(0, maxLength);
}

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

function toCandidate(raw: unknown): CandidateGarment | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = readOptionalString(
    record.garmentId ?? record.garment_id ?? record.id,
  );
  if (id === null) {
    return null;
  }
  return {
    id,
    garmentType: readClosed(
      record.garmentType ?? record.garment_type,
      normalizeGarmentType,
    ),
    color: readClosed(record.color, normalizeGarmentColor),
    colorBase: readBaseColor(
      record.extraTags ?? record.extra_tags,
    ),
    material: readClosed(record.material, normalizeGarmentMaterial),
    materialDetail: readMaterialDetail(
      record.extraTags ?? record.extra_tags,
    ),
    season: readClosed(record.season, normalizeGarmentSeason),
    style: readClosed(record.style, normalizeGarmentStyle),
    isDirty:
      record.isDirty === true || (record as Record<string, unknown>).is_dirty === true,
  };
}

function readStylistProfile(value: unknown): StylistProfile | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    colorimetry: readOptionalString(record.colorimetry),
    morphology: readOptionalString(record.morphology),
    preferredFit: readOptionalString(
      record.preferredFit ?? record.preferred_fit,
    ),
    lifestyle: readOptionalString(record.lifestyle),
    skinTone: readOptionalString(record.skinTone ?? record.skin_tone),
    eyeColor: readOptionalString(record.eyeColor ?? record.eye_color),
    hairColor: readOptionalString(record.hairColor ?? record.hair_color),
  };
}

function readTemperatureCelsius(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : DEFAULT_TEMPERATURE_C;
}

function readOptionalTemperature(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readOptionalProbability(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function readIdList(value: unknown): string[] {
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
function readLocale(
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

// Strict style filtering: the requested look style only admits garments
// whose own style tag matches. Keys are the garment closed style
// vocabulary (the same tags the closet form assigns), so the auto-mode
// selector, the form and the filter can never drift apart. Matching is
// accent- and case-insensitive. A null or untagged garment style never
// matches: under hard filtering only explicitly tagged garments reach
// the LLM.
const STYLE_FILTER_KEYWORDS: Record<string, string[]> = {
  casual: ["casual", "daily", "relaxed", "informal"],
  formal: [
    "formal",
    "oficina",
    "office",
    "corporate",
    "business",
    "work",
    "traje",
  ],
  sport: [
    "sport",
    "sports",
    "active",
    "athletic",
    "gym",
    "training",
    "deporte",
  ],
  elegant: ["elegant", "elegante", "classic"],
  streetwear: ["streetwear", "urban"],
  party: [
    "party",
    "noche",
    "evening",
    "night",
    "fiesta",
    "formal",
    "event",
    "social",
  ],
};

// Legacy aliases from profile lifestyles (and the old 3-option home
// selector). Existing garments tagged with lifestyle values keep matching
// through these aliases; they only normalize old requests.
const LEGACY_STYLE_ALIASES: Record<string, string> = {
  casual_daily: "casual",
  corporate_office: "formal",
  active_sports: "sport",
  home_remote: "casual",
  social_events: "party",
  oficina: "formal",
  noche: "party",
};

// English descriptors for the LLM prompt, keyed by style filter.
const STYLE_PROMPT_LABELS: Record<string, string> = {
  casual: "a casual daily look",
  formal: "office wear",
  sport: "an active sporty look",
  elegant: "an elegant look",
  streetwear: "a streetwear look",
  party: "a social event night out",
};

function normalizeStyleText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function readRequestedStyle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = normalizeStyleText(value);
  if (STYLE_FILTER_KEYWORDS[normalized] !== undefined) {
    return normalized;
  }
  const alias = LEGACY_STYLE_ALIASES[normalized];
  return alias !== undefined ? alias : null;
}function matchesRequestedStyle(
  garmentStyle: string | null,
  styleKey: string,
): boolean {
  if (garmentStyle === null) {
    return false;
  }
  const normalized = normalizeStyleText(garmentStyle);
  if (normalized === "") {
    return false;
  }
  const keywords = STYLE_FILTER_KEYWORDS[styleKey];
  return keywords.some(
    (keyword) => normalized === keyword || normalized.includes(keyword),
  );
}

// Adapt the minimized candidate to the shared classifier so server and
// client categorize garments with the same rules.
function toClassifiableGarment(candidate: CandidateGarment): Garment {
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

// Integrity check: a look needs at least a top and a bottom, unless a
// one-piece garment (dress, jumpsuit) covers both in a single item.
function canBuildLook(pool: CandidateGarment[]): boolean {
  const garments = pool.map(toClassifiableGarment);
  if (garments.some((garment) => isOnePieceGarment(garment))) {
    return true;
  }
  const categories = new Set(
    garments.map((garment) => categorizeGarment(garment)),
  );
  return categories.has("top") && categories.has("bottom");
}

// Strict business rule: above the heat threshold, winter garments never
// reach the LLM. The filter runs on the already-minimized candidate list,
// so excluded items are never serialized into the prompt.
function applyHeatRule(
  candidates: CandidateGarment[],
  temperatureC: number,
): { kept: CandidateGarment[]; excludedWinterCount: number } {
  if (temperatureC <= HEAT_THRESHOLD_C) {
    return { kept: candidates, excludedWinterCount: 0 };
  }
  const kept = candidates.filter(
    (candidate) => (candidate.season ?? "").toLowerCase() !== "winter",
  );
  return { kept, excludedWinterCount: candidates.length - kept.length };
}

// Rain-material rule (#BKL-001): silk spots and suede ruins in rain, so
// vulnerable candidates never reach the LLM on wet days. Explicit user
// pins (locked IDs) always survive: the user overrules the weather.
function applyRainMaterialRule(
  candidates: CandidateGarment[],
  isRainy: boolean,
  lockedIds: Set<string>,
): { kept: CandidateGarment[]; excludedRainCount: number } {
  if (!isRainy) {
    return { kept: candidates, excludedRainCount: 0 };
  }
  const kept = candidates.filter(
    (candidate) =>
      lockedIds.has(candidate.id) ||
      !isRainVulnerableMaterial(candidate.material, candidate.materialDetail),
  );
  return { kept, excludedRainCount: candidates.length - kept.length };
}

// Outerwear demand: rain (condition or >=50% probability) or cold days
// (same 15C threshold as the client outerwear carousel) require a coat.
// Only enforced when the pool actually offers outerwear candidates.
function isRainyWeather(
  condition: string | null,
  rainProbability: number | null,
): boolean {
  if (
    rainProbability !== null &&
    rainProbability >= RAIN_EXPECTED_THRESHOLD
  ) {
    return true;
  }
  const normalized = (condition ?? "").toLowerCase();
  return (
    normalized !== "" &&
    RAINY_CONDITIONS.some((rainy) => normalized.includes(rainy))
  );
}

function poolHasOuterwear(pool: CandidateGarment[]): boolean {
  return pool.some(
    (candidate) =>
      categorizeGarment(toClassifiableGarment(candidate)) === "outerwear",
  );
}

// ---------------------------------------------------------------------------
// Local emergency stylist (graceful degradation): when Groq fails after
// its retries (quota, outage), the server still answers 200 with a
// rule-based look instead of a 502. Locked garments are hard constraints;
// picks prefer the current season and obey the color lifesaver rule.
// ---------------------------------------------------------------------------
const NEUTRAL_COLORS = ["white", "black", "gray", "beige", "navy"];
const FALLBACK_RATIOS = [60, 55, 50];

function isNeutralCandidate(candidate: CandidateGarment): boolean {
  // A garment counts as neutral when either its closed color or its
  // generic base color is neutral (blue jeans with a black base count).
  const tones = [candidate.color, candidate.colorBase].map((tone) =>
    (tone ?? "").toLowerCase(),
  );
  return tones.some((tone) => NEUTRAL_COLORS.includes(tone));
}

// Lower score = better season fit for the current temperature.
function seasonFitScore(
  season: GarmentSeason | null,
  temperatureC: number,
): number {
  if (temperatureC >= HEAT_THRESHOLD_C) {
    return season === "summer" || season === "all" ? 0 : 1;
  }
  if (temperatureC < COLD_THRESHOLD_C) {
    return season === "winter" ||
      season === "mid_season" ||
      season === "all"
      ? 0
      : 1;
  }
  return season === "all" || season === "mid_season" ? 0 : 1;
}

function shuffled<T>(entries: T[]): T[] {
  const copy = [...entries];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[pick]] = [copy[pick], copy[index]];
  }
  return copy;
}

// Best pick of a category: locked pins win, then season fit, then chance.
function pickCandidate(
  candidates: CandidateGarment[],
  lockedIds: Set<string>,
  temperatureC: number,
): CandidateGarment | null {
  const locked = candidates.filter((candidate) =>
    lockedIds.has(candidate.id),
  );
  if (locked.length > 0) {
    return locked[0];
  }
  const ranked = shuffled(candidates).sort(
    (a, b) =>
      seasonFitScore(a.season, temperatureC) -
      seasonFitScore(b.season, temperatureC),
  );
  return ranked[0] ?? null;
}

function categoryOf(candidate: CandidateGarment) {
  return categorizeGarment(toClassifiableGarment(candidate));
}

function generateFallbackLook(
  pool: CandidateGarment[],
  lockedIds: Set<string>,
  temperatureC: number,
  requireOuterwear: boolean,
): OutfitOption[] {
  const byCategory = new Map<string, CandidateGarment[]>();
  for (const candidate of pool) {
    const category = categoryOf(candidate);
    if (category === null) {
      continue;
    }
    const list = byCategory.get(category) ?? [];
    list.push(candidate);
    byCategory.set(category, list);
  }

  const options: OutfitOption[] = [];
  const seen = new Set<string>();
  for (let round = 0; round < 3; round += 1) {
    const top = pickCandidate(byCategory.get("top") ?? [], lockedIds, temperatureC);
    if (!top) {
      break;
    }
    const ids = [top.id];
    // One-piece tops cover the bottom: never append trousers to a dress.
    const onePiece = isOnePieceGarment(toClassifiableGarment(top));
    if (!onePiece) {
      let bottoms = byCategory.get("bottom") ?? [];
      // Color lifesaver: a loud top demands a neutral bottom.
      if (!isNeutralCandidate(top)) {
        const neutrals = bottoms.filter(isNeutralCandidate);
        if (neutrals.length > 0) {
          bottoms = neutrals;
        }
      }
      const bottom = pickCandidate(bottoms, lockedIds, temperatureC);
      if (!bottom) {
        break;
      }
      ids.push(bottom.id);
    }
    const footwear = pickCandidate(
      byCategory.get("footwear") ?? [],
      lockedIds,
      temperatureC,
    );
    if (footwear) {
      ids.push(footwear.id);
    }
    if (requireOuterwear) {
      const outerwear = pickCandidate(
        byCategory.get("outerwear") ?? [],
        lockedIds,
        temperatureC,
      );
      if (outerwear) {
        ids.push(outerwear.id);
      }
    }
    const signature = [...ids].sort().join("|");
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    options.push({
      garmentIds: ids,
      suitabilityRatio: FALLBACK_RATIOS[options.length] ?? 50,
      reason: "",
    });
    if (options.length >= 3) {
      break;
    }
  }
  if (options.length === 0) {
    throw new Error("No buildable outfit for local fallback.");
  }
  return options;
}

// Upstream hiccups (Groq HTTP errors, empty completions, unusable model
// output) degrade to the local fallback: 502 only when the fallback
// itself cannot build a look. Anything else is a server bug: 500.
function isUpstreamFailure(error: unknown): boolean {
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    return true;
  }
  return (
    error instanceof Error &&
    /not configured|empty completion|LLM response|LLM options/.test(
      error.message,
    )
  );
}

function clampRatio(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseOptions(content: string, knownIds: Set<string>): OutfitOption[] {
  const parsed: unknown = JSON.parse(content);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM response is not a JSON object");
  }
  const options = (parsed as Record<string, unknown>).options;
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error("LLM response has no outfit options");
  }

  const valid: OutfitOption[] = [];
  for (const entry of options.slice(0, 3)) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const garmentIds = readIdList(record.garmentIds).filter((id) =>
      knownIds.has(id),
    );
    if (garmentIds.length === 0) {
      continue;
    }
    valid.push({
      garmentIds,
      suitabilityRatio: clampRatio(record.suitabilityRatio),
      reason: readOptionalString(record.reason) ?? "",
    });
  }

  if (valid.length === 0) {
    throw new Error("LLM options reference no known garment IDs");
  }
  return valid;
}

// Balance helper: stable category order for the token-budget cap.
const POOL_CATEGORY_ORDER = ["top", "bottom", "footwear", "outerwear"];

function capBalancedPool(
  pool: CandidateGarment[],
  lockedIds: Set<string>,
): CandidateGarment[] {
  if (pool.length <= MAX_GARMENTS) {
    return pool;
  }
  const locked = pool.filter((candidate) => lockedIds.has(candidate.id));
  const groups = new Map<string, CandidateGarment[]>();
  for (const candidate of pool) {
    if (lockedIds.has(candidate.id)) {
      continue;
    }
    const category =
      categorizeGarment(toClassifiableGarment(candidate)) ?? "other";
    const list = groups.get(category) ?? [];
    list.push(candidate);
    groups.set(category, list);
  }
  const ordered = POOL_CATEGORY_ORDER.filter((category) =>
    groups.has(category),
  );
  for (const category of groups.keys()) {
    if (!ordered.includes(category)) {
      ordered.push(category);
    }
  }
  // Round-robin across categories so every represented family keeps
  // candidates; per-category soft cap keeps one family from eating the
  // whole budget.
  const capped: CandidateGarment[] = [...locked];
  const cappedIds = new Set(capped.map((candidate) => candidate.id));
  const taken = new Map<string, number>();
  let progress = true;
  while (capped.length < MAX_GARMENTS && progress) {
    progress = false;
    for (const category of ordered) {
      if (capped.length >= MAX_GARMENTS) {
        break;
      }
      if ((taken.get(category) ?? 0) >= MAX_PER_CATEGORY) {
        continue;
      }
      const next = groups.get(category)?.shift();
      if (next === undefined) {
        continue;
      }
      capped.push(next);
      cappedIds.add(next.id);
      taken.set(category, (taken.get(category) ?? 0) + 1);
      progress = true;
    }
  }
  // Overflow: single-family closets still fill the budget in closet order.
  if (capped.length < MAX_GARMENTS) {
    for (const candidate of pool) {
      if (capped.length >= MAX_GARMENTS) {
        break;
      }
      if (!cappedIds.has(candidate.id)) {
        capped.push(candidate);
        cappedIds.add(candidate.id);
      }
    }
  }
  return capped;
}

// POST /api/recommender
// Body: { garments: Garment[], temperatureC?: number, condition?: string,
//         dayLow?: number, dayHigh?: number, rainProbability?: number,
//         profile?: {...}, mood?: string, style?: GarmentStyle
//         ("casual" | "formal" | "sport" | "elegant" | "streetwear" | "party"),
//         lockedGarmentIds?: string[], dismissedGarmentIds?: string[] }
// lockedGarmentIds also accepts the wizard alias fixed_garments /
// fixedGarments: pinned IDs always survive filtering as hard constraints.
// Thin controller: validates input, builds the prompt via prompts.ts,
// calls the engine, validates the output. Dirty garments never reach the
// engine (see eligible filter below). When `style` is provided, hard
// filtering applies: without enough matching garments the handler answers
// 422 { error: "INSUFFICIENT_STYLE_GARMENTS" } and never calls the LLM.
export async function POST(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Paid upstream (Groq): require an authenticated session before any
  // parsing or billing-relevant work.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    logger.requestComplete('recommender', requestId, 401, Date.now() - startTime);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.requestStart('recommender', requestId, user.id);

  // Authenticated users still share one Groq quota: max 5 requests per
  // minute per user (in-memory window, see lib/rateLimit.ts).
  const { key, limit, windowMs } = RATE_LIMITS.recommender;
  const quota = checkRateLimit(`${key}:${user.id}`, limit, windowMs);
  if (quota.limited) {
    logger.warn('Rate limit exceeded', { route: 'recommender', requestId, userId: user.id, retryAfterSec: quota.retryAfterSec });
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { [RETRY_AFTER_HEADER]: String(quota.retryAfterSec) },
      },
    );
  }

  if (!process.env.GROQ_API_KEY) {
    logger.error('GROQ_API_KEY not configured', { route: 'recommender', requestId });
    return NextResponse.json(
      { error: "AI service is not configured (GROQ_API_KEY)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }
  const input = body as Record<string, unknown>;

  if (!Array.isArray(input.garments) || input.garments.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty garments array." },
      { status: 400 },
    );
  }
  if (input.garments.length > 200) {
    return NextResponse.json(
      { error: "Too many garments in a single request." },
      { status: 413 },
    );
  }
  const candidates = input.garments
    .map(toCandidate)
    .filter((candidate): candidate is CandidateGarment => candidate !== null);
  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "No valid garments with IDs were provided." },
      { status: 400 },
    );
  }

  const temperatureC = readTemperatureCelsius(input.temperatureC);
  const dayLow = readOptionalTemperature(input.dayLow);
  const dayHigh = readOptionalTemperature(input.dayHigh);
  const rainProbability = readOptionalProbability(input.rainProbability);
  const condition = readOptionalString(input.condition);
  const isRainy = isRainyWeather(condition, rainProbability);
  // Pinned IDs are read before weather filtering so the rain-material
  // rule can exempt explicit user pins (same hard-constraint contract
  // as the style filter and the eligible gate below).
  const requestedLockedIds = new Set(
    readIdList(
      input.lockedGarmentIds ?? input.fixed_garments ?? input.fixedGarments,
    ),
  );
  // Day-based heat rule: if it will be hot at any point today, winter
  // garments never reach the LLM, even on a mild morning.
  const { kept: heatKept, excludedWinterCount } = applyHeatRule(
    candidates,
    dayHigh ?? temperatureC,
  );
  // Rain-material rule: silk/suede never reach the LLM on wet days
  // unless the user explicitly pinned them.
  const { kept, excludedRainCount } = applyRainMaterialRule(
    heatKept,
    isRainy,
    requestedLockedIds,
  );
  if (kept.length === 0) {
    return NextResponse.json(
      { error: "No candidate garments left after weather filtering." },
      { status: 400 },
    );
  }

  const lockedCandidates = readIdList(
    // Wizard contract ("Bloquear y Generar") sends fixed_garments as the
    // hard constraints; the auto flow sends lockedGarmentIds. Both alias
    // the same rigid restriction.
    input.lockedGarmentIds ?? input.fixed_garments ?? input.fixedGarments,
  )
    .map((id) => kept.find((candidate) => candidate.id === id))
    .filter(
      (candidate): candidate is CandidateGarment => candidate !== undefined,
    );
  // Negative feedback ("change garment") plus hygiene: dirty or dismissed
  // garments never reach the LLM (locked ones always survive).
  const lockedIds = new Set(lockedCandidates.map((candidate) => candidate.id));
  const dismissedIds = new Set(readIdList(input.dismissedGarmentIds));
  const eligible = kept.filter(
    (candidate) =>
      lockedIds.has(candidate.id) ||
      (!dismissedIds.has(candidate.id) && !candidate.isDirty),
  );
  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "No candidate garments left after applying feedback." },
      { status: 400 },
    );
  }
  if (eligible.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 candidate garments to build an outfit." },
      { status: 400 },
    );
  }

  // Strict style filtering (hard filter): non-locked candidates must match
  // the requested style, so the LLM can never pad a look with off-style
  // garments by elimination. Locked garments are explicit user pins and
  // always survive the filter.
  const requestedStyle = readRequestedStyle(input.style);
  let pool = eligible;
  if (requestedStyle !== null) {
    pool = eligible.filter(
      (candidate) =>
        lockedIds.has(candidate.id) ||
        matchesRequestedStyle(candidate.style, requestedStyle),
    );
    if (!canBuildLook(pool)) {
      // No Groq call: failing fast keeps the response honest instead of
      // returning a look stitched from the wrong style.
      return NextResponse.json(
        { error: "INSUFFICIENT_STYLE_GARMENTS" },
        { status: 422 },
      );
    }
  }
  // Token-budget cap with category balance: a blind head-slice would
  // silently drop whole families (e.g. every shoe) when the closet is
  // large. Locked pins always survive; the rest fills round-robin so each
  // represented category keeps at least one candidate.
  const cappedPool = capBalancedPool(pool, lockedIds);
  const knownIds = new Set(cappedPool.map((candidate) => candidate.id));

  // Hard outerwear rule: with rain or cold the model must dress an
  // available coat in every option (mirrors the client carousel logic).
  const outerwearRequired =
    poolHasOuterwear(cappedPool) &&
    (isRainy || (dayLow ?? temperatureC) < COLD_THRESHOLD_C);
  // Rain-safe prompt rule: the pool is already filtered, but the mandate
  // stops the model from favoring vulnerable leftovers (locked pins).
  const requireRainSafeMaterials = isRainy;

  const locale = readLocale(input.locale ?? input.language, request);

  const { systemPrompt, userPayload } = buildOutfitPrompt({
    profile: readStylistProfile(input.profile),
    climate: {
      temperatureC,
      condition,
      dayLow,
      dayHigh,
      rainProbability,
    },
    lockedGarments: lockedCandidates.map((candidate) => ({
      id: candidate.id,
      garmentType: candidate.garmentType,
      color: candidate.color,
    })),
    styleFilter:
      requestedStyle !== null ? STYLE_PROMPT_LABELS[requestedStyle] : null,
    requireOuterwear: outerwearRequired,
    requireRainSafeMaterials,
    locale,
    payload: {
      temperatureC,
      dayLow,
      dayHigh,
      rainProbability,
      requireOuterwear: outerwearRequired,
      requireRainSafeMaterials,
      profile: input.profile,
      mood: readOptionalString(input.mood),
      style: requestedStyle,
      lockedGarmentIds: [...lockedIds],
      candidates: cappedPool,
      locale,
    },
  });

  let options: OutfitOption[];
  let isFallback = false;
  try {
    const content = await generateOutfitRecommendation(
      systemPrompt,
      userPayload,
    );
    options = parseOptions(content, knownIds);
  } catch (error) {
    // Log the real cause server-side: the client only gets a short
    // message, so without this the failure is impossible to diagnose.
    const message = error instanceof Error ? error.message : String(error);
    const status = (error as { status?: unknown }).status;
    const statusSuffix =
      typeof status === "number" ? ` (status ${status})` : "";
    if (!isUpstreamFailure(error)) {
      logger.error(`Request failed: ${message}${statusSuffix}`, { route: 'recommender', requestId, userId: user.id, error, status });
      return NextResponse.json(
        { error: "Unexpected recommender error." },
        { status: 500 },
      );
    }
    // Graceful degradation: the local cerebelo answers with the same
    // contract plus _isFallback so the client skips AI training.
    logger.warn(`LLM failed, using local fallback: ${message}${statusSuffix}`, { route: 'recommender', requestId, userId: user.id, error, status });
    try {
      options = generateFallbackLook(
        cappedPool,
        lockedIds,
        temperatureC,
        outerwearRequired,
      );
      isFallback = true;
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);
      logger.error(`Local fallback failed: ${fallbackMessage}`, { route: 'recommender', requestId, userId: user.id, error: fallbackError });
      return NextResponse.json(
        { error: "AI service request failed. Try again." },
        { status: 502 },
      );
    }
  }
  const durationMs = Date.now() - startTime;
  logger.requestComplete('recommender', requestId, 200, durationMs, {
    userId: user.id,
    isFallback,
    optionsCount: options.length,
    model: isFallback ? "local-fallback" : getEngineModel(),
    excludedWinterGarments: excludedWinterCount,
    excludedRainMaterials: excludedRainCount,
    excludedDismissedGarments: kept.length - eligible.length,
  });
  // Debug headers for observability (safe to expose, no secrets)
  const responseHeaders = {
    "x-groq-model": isFallback ? "local-fallback" : getEngineModel(),
    "x-fallback": String(isFallback),
    "x-options-count": String(options.length),
    "x-excluded-winter": String(excludedWinterCount),
    "x-excluded-rain": String(excludedRainCount),
    "x-excluded-dismissed": String(kept.length - eligible.length),
    "x-request-id": requestId,
  };
  return NextResponse.json(
    {
      options,
      temperatureC,
      requiredOuterwear: outerwearRequired,
      _isFallback: isFallback,
      excludedWinterGarments: excludedWinterCount,
      excludedRainMaterials: excludedRainCount,
      excludedDismissedGarments: kept.length - eligible.length,
      model: isFallback ? "local-fallback" : getEngineModel(),
    },
    { status: 200, headers: responseHeaders },
  );
}
