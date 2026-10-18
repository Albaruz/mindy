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
export const STYLE_PROMPT_LABELS: Record<string, string> = {
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

export function readRequestedStyle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = normalizeStyleText(value);
  if (STYLE_FILTER_KEYWORDS[normalized] !== undefined) {
    return normalized;
  }
  const alias = LEGACY_STYLE_ALIASES[normalized];
  return alias !== undefined ? alias : null;
}

export function matchesRequestedStyle(
  garmentStyle: string | string[] | null,
  styleKey: string,
): boolean {
  if (garmentStyle === null) {
    return false;
  }
  const keywords = STYLE_FILTER_KEYWORDS[styleKey];
  const values = Array.isArray(garmentStyle) ? garmentStyle : [garmentStyle];
  return values.some((value) => {
    const normalized = normalizeStyleText(value);
    return normalized !== "" && keywords.some(
      (keyword) => normalized === keyword || normalized.includes(keyword),
    );
  });
}
