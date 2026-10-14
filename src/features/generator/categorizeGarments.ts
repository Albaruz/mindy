import type { Garment } from "@/types/garment";
import type { Category } from "./useGeneratorStore";
import { normalizeGarmentType } from "@/features/closet/garmentOptions";

// Closed-vocabulary mapping: garment_type IS the macro category, except
// "dress" which covers top + bottom in a single item (one-piece).
// Keyword fallback below only serves legacy rows written before the
// closed enum (free-text garment_type); new rows never need it.
// Keywords are English only: legacy Spanish values are normalized to the
// closed base (with the original detail in extra_tags) by the SQL
// normalization migration, so the fallback never sees them.
// One-piece garments cover top + bottom in a single item, so the bottom
// carousel must be hidden while one of them is selected on top.
const ONE_PIECE_KEYWORDS = ["dress", "gown", "jumpsuit"];

// Lowercase for case-insensitive legacy matching.
function normalizeGarmentText(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return value.toLowerCase().trim();
}
const KEYWORDS: Record<Category, string[]> = {
  top: [
    "t-shirt",
    "tshirt",
    "tee",
    "shirt",
    "blouse",
    "sweater",
    "hoodie",
    "sweatshirt",
    "polo",
    "tank",
    "top",
    "dress",
    "gown",
    "jumpsuit",
  ],
  bottom: [
    "jeans",
    "pants",
    "trousers",
    "shorts",
    "skirt",
    "leggings",
    "chinos",
    "joggers",
    "bottom",
  ],
  footwear: [
    "sneakers",
    "shoe",
    "shoes",
    "boots",
    "sandals",
    "heels",
    "loafers",
    "trainers",
    "footwear",
    "flats",
  ],
  outerwear: [
    "jacket",
    "coat",
    "blazer",
    "parka",
    "vest",
    "windbreaker",
    "cardigan",
    "outerwear",
  ],
};

const CATEGORY_ORDER: Category[] = ["top", "bottom", "footwear", "outerwear"];

// Strict base for the closed garment_type. Dress is one-piece: it fills
// the top slot (see isOnePieceGarment) and covers the bottom slot too.
function closedTypeCategory(garment: Garment): Category | null {
  switch (garment.garmentType) {
    case "top":
    case "dress":
      return "top";
    case "bottom":
      return "bottom";
    case "footwear":
      return "footwear";
    case "outerwear":
      return "outerwear";
    default:
      return null;
  }
}

export function categorizeGarment(garment: Garment): Category | null {
  // Closed enum fast path: no keyword guessing needed.
  const strict = closedTypeCategory(garment);
  if (strict !== null) {
    return strict;
  }
  // Legacy rows predating the closed enum (e.g. free-text Spanish
  // "camisa", "zapatos"): normalize to the closed base first so they
  // keep categorizing instead of vanishing from every slot.
  const legacyBase = normalizeGarmentType(
    garment.garmentType ??
      (typeof garment.extraTags?.specificType === "string"
        ? garment.extraTags.specificType
        : ""),
  ).base;
  if (legacyBase !== null) {
    return closedTypeCategory({ ...garment, garmentType: legacyBase });
  }
  // Prefer the AI vision category stored in extra_tags when available.
  const stored = garment.extraTags?.aiCategory;
  if (
    stored === "top" ||
    stored === "bottom" ||
    stored === "footwear" ||
    stored === "outerwear"
  ) {
    return stored;
  }
  // Legacy rows predating the footwear rename may still carry "shoes" in
  // extra_tags.aiCategory; map it forward instead of dropping the garment.
  if (stored === "shoes") {
    return "footwear";
  }
  // Legacy fallback: free-text garment_type or specificType detail
  // (sneakers, t-shirt, ...) written before the closed enum.
  const haystack = normalizeGarmentText(
    garment.garmentType ??
      (typeof garment.extraTags?.specificType === "string"
        ? garment.extraTags.specificType
        : ""),
  );
  if (haystack === "") {
    return null;
  }
  for (const category of CATEGORY_ORDER) {
    if (KEYWORDS[category].some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }
  return null;
}

export function categorizeGarments(
  garments: Garment[],
): Record<Category, Garment[]> {
  const grouped: Record<Category, Garment[]> = {
    top: [],
    bottom: [],
    footwear: [],
    outerwear: [],
  };
  for (const garment of garments) {
    const category = categorizeGarment(garment);
    if (category !== null) {
      grouped[category].push(garment);
    }
  }
  return grouped;
}

export function isOnePieceGarment(
  garment: Garment | null | undefined,
): boolean {
  if (garment?.garmentType === "dress") {
    return true;
  }
  const haystack = normalizeGarmentText(
    garment?.garmentType ??
      (typeof garment?.extraTags?.specificType === "string"
        ? garment.extraTags.specificType
        : ""),
  );
  if (haystack === "") {
    return false;
  }
  return ONE_PIECE_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

// Footwear and outerwear are reusable across wears: wearing them never
// marks them as dirty, so they stay out of the laundry basket and remain
// eligible for recommendations even when flagged dirty (legacy rows).
export function isLaundryExemptGarment(
  garment: Garment | null | undefined,
): boolean {
  if (garment === null || garment === undefined) {
    return false;
  }
  const category = categorizeGarment(garment);
  return category === "footwear" || category === "outerwear";
}

// Laundry-state predicates. Every filter over is_dirty goes through these,
// so the footwear/outerwear exemption cannot be forgotten.
/** Garments that wash: everything except laundry-exempt categories. */
export function isWashableGarment(garment: Garment): boolean {
  return !isLaundryExemptGarment(garment);
}

/** Clean garments, plus exempt ones even if a legacy row flags them dirty. */
export function isWearableGarment(garment: Garment): boolean {
  return !garment.isDirty || isLaundryExemptGarment(garment);
}

/** Dirty garments that belong in the laundry basket. */
export function isInLaundryGarment(garment: Garment): boolean {
  return garment.isDirty && !isLaundryExemptGarment(garment);
}

// One-piece looks never include a bottom: when a dress (or jumpsuit)
// is present, drop bottom-category garments so confirmations, history
// and the laundry only ever see the selected garments.
export function withoutHiddenBottom(garments: Garment[]): Garment[] {
  if (!garments.some((garment) => isOnePieceGarment(garment))) {
    return garments;
  }
  return garments.filter(
    (garment) => categorizeGarment(garment) !== "bottom",
  );
}
