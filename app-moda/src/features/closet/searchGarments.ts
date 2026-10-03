import type { Garment } from "@/types/garment";
import type { CategoryFilter } from "@/components/FilterChips/FilterChips";
import type { Category } from "@/features/generator/useGeneratorStore";
import { categorizeGarment } from "@/features/generator/categorizeGarments";
import { expandSearchQuery, normalizeSearchText } from "@/lib/taxonomy";

// Generic base color stored inside the extra_tags JSONB (e.g. "rojo" for a
// "burdeos" garment). Accepts both snake_case and camelCase keys.
function readBaseColor(extraTags: Record<string, unknown>): string {
  const raw = extraTags["color_base"] ?? extraTags["colorBase"];
  return typeof raw === "string" ? raw : "";
}

// Every searchable text of a garment, normalized for comparison: the four
// core fields plus every string value stored in extra_tags.
function getHaystacks(garment: Garment): string[] {
  const extraValues = Object.values(garment.extraTags ?? {}).filter(
    (value): value is string => typeof value === "string",
  );
  return [
    garment.garmentType,
    garment.color,
    garment.style,
    garment.material,
    readBaseColor(garment.extraTags ?? {}),
    ...extraValues,
  ]
    .map((value) => normalizeSearchText(value ?? ""))
    .filter((haystack) => haystack !== "");
}

// Token matching (not substring): a term matches when it equals a full
// whitespace-separated token, modulo hyphen/underscore joiners and a
// trailing plural s/es on either side. This keeps singular/plural pairs
// ("jean"/"jeans", "sneaker"/"sneakers") working while killing substring
// accidents such as "red" matching "tailored" or "top" matching
// "high-top sneakers".
function stripJoiners(token: string): string {
  return token.replace(/[-_]/g, "");
}

function matchesToken(token: string, needle: string): boolean {
  return (
    token === needle ||
    token === `${needle}s` ||
    token === `${needle}es` ||
    needle === `${token}s` ||
    needle === `${token}es`
  );
}

function haystackMatches(haystack: string, term: string): boolean {
  const needle = stripJoiners(normalizeSearchText(term));
  if (needle === "") {
    return false;
  }
  return normalizeSearchText(haystack)
    .split(" ")
    .filter((token) => token !== "")
    .some((token) => matchesToken(stripJoiners(token), needle));
}

// Strict AND filtering: every query concept must match at least one field.
// Each concept matches when any of its expansions matches a full token of
// any haystack ("pantalon lino" requires a bottom-like field AND linen).
export function matchesGarmentSearch(
  garment: Garment,
  query: string,
): boolean {
  const expansions = expandSearchQuery(query);
  if (expansions.length === 0) {
    return true;
  }
  const haystacks = getHaystacks(garment);
  if (haystacks.length === 0) {
    return false;
  }
  return expansions.every((equivalents) =>
    equivalents.some((term) =>
      haystacks.some((haystack) => haystackMatches(haystack, term)),
    ),
  );
}

// Empty query matches everything so the full closet shows by default.
export function filterGarmentsBySearch(
  garments: Garment[],
  query: string,
): Garment[] {
  if (expandSearchQuery(query).length === 0) {
    return garments;
  }
  return garments.filter((garment) => matchesGarmentSearch(garment, query));
}

// Chip keys to their generator slot. Chips reuse the same closed
// categorization as the generator carousels (tops includes one-piece
// dresses), so both views always agree. "all" disables the prefilter.
const CATEGORY_SLOT: Record<Exclude<CategoryFilter, "all">, Category> = {
  tops: "top",
  bottoms: "bottom",
  shoes: "footwear",
  outerwear: "outerwear",
};

// Strict category prefilter: the garment belongs to the chip slot
// (closed garment_type/aiCategory first, legacy free text normalized,
// English keyword fallback last — see categorizeGarment).
export function matchesGarmentCategory(
  garment: Garment,
  category: CategoryFilter,
): boolean {
  if (category === "all") {
    return true;
  }
  return categorizeGarment(garment) === CATEGORY_SLOT[category];
}

export function filterGarmentsByCategory(
  garments: Garment[],
  category: CategoryFilter,
): Garment[] {
  if (category === "all") {
    return garments;
  }
  return garments.filter((garment) =>
    matchesGarmentCategory(garment, category),
  );
}
