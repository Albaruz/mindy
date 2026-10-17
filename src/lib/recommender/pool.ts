import {
  RECOMMENDER_MAX_GARMENTS,
  RECOMMENDER_MAX_PER_CATEGORY,
} from "@/constants/generator";
import {
  categorizeGarment,
  isOnePieceGarment,
} from "@/lib/garment/categorizeGarments";
import { toClassifiableGarment } from "./request";
import type { CandidateGarment } from "./types";
// Integrity check: a look needs at least a top and a bottom, unless a
// one-piece garment (dress, jumpsuit) covers both in a single item.
export function canBuildLook(pool: CandidateGarment[]): boolean {
  const garments = pool.map(toClassifiableGarment);
  if (garments.some((garment) => isOnePieceGarment(garment))) {
    return true;
  }
  const categories = new Set(
    garments.map((garment) => categorizeGarment(garment)),
  );
  return categories.has("top") && categories.has("bottom");
}

// Balance helper: stable category order for the token-budget cap.
const POOL_CATEGORY_ORDER = ["top", "bottom", "footwear", "outerwear"];

function candidateQualityScore(candidate: CandidateGarment): number {
  return [
    candidate.garmentType,
    candidate.color,
    candidate.material,
    candidate.season,
    candidate.style,
    candidate.typeDetail,
    candidate.visualDescription,
  ].filter((value) => typeof value === "string" && value !== "").length;
}

export function capBalancedPool(
  pool: CandidateGarment[],
  lockedIds: Set<string>,
): CandidateGarment[] {
  if (pool.length <= RECOMMENDER_MAX_GARMENTS) {
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
  for (const list of groups.values()) {
    list.sort((a, b) => candidateQualityScore(b) - candidateQualityScore(a));
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
  while (capped.length < RECOMMENDER_MAX_GARMENTS && progress) {
    progress = false;
    for (const category of ordered) {
      if (capped.length >= RECOMMENDER_MAX_GARMENTS) {
        break;
      }
      if ((taken.get(category) ?? 0) >= RECOMMENDER_MAX_PER_CATEGORY) {
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
  if (capped.length < RECOMMENDER_MAX_GARMENTS) {
    for (const candidate of pool) {
      if (capped.length >= RECOMMENDER_MAX_GARMENTS) {
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
