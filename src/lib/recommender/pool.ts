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
const POOL_CATEGORY_ORDER = [
  "top",
  "mid_layer",
  "bottom",
  "footwear",
  "outerwear",
];

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

type RandomSource = () => number;

function shuffle<T>(entries: T[], random: RandomSource): T[] {
  const shuffled = [...entries];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
  }
  return shuffled;
}

// Keep richer candidates first, but randomize equal-quality groups so repeated
// generations do not always send the same items from a large closet to the LLM.
function orderByQualityWithRandomTies(
  entries: CandidateGarment[],
  random: RandomSource,
): CandidateGarment[] {
  const byQuality = new Map<number, CandidateGarment[]>();
  for (const candidate of entries) {
    const score = candidateQualityScore(candidate);
    const group = byQuality.get(score) ?? [];
    group.push(candidate);
    byQuality.set(score, group);
  }

  return [...byQuality.keys()]
    .sort((a, b) => b - a)
    .flatMap((score) => shuffle(byQuality.get(score) ?? [], random));
}

export function capBalancedPool(
  pool: CandidateGarment[],
  lockedIds: Set<string>,
  priorityIds: Set<string> = new Set(),
  random: RandomSource = Math.random,
): CandidateGarment[] {
  if (pool.length <= RECOMMENDER_MAX_GARMENTS) {
    return pool;
  }
  const locked = pool.filter((candidate) => lockedIds.has(candidate.id));
  const lockedCandidateIds = new Set(locked.map((candidate) => candidate.id));
  const priority = pool.filter(
    (candidate) =>
      priorityIds.has(candidate.id) && !lockedCandidateIds.has(candidate.id),
  );
  const priorityCapacity = Math.max(0, RECOMMENDER_MAX_GARMENTS - locked.length);
  const retainedPriority = priority.slice(0, priorityCapacity);
  const retainedPriorityIds = new Set(
    retainedPriority.map((candidate) => candidate.id),
  );
  const groups = new Map<string, CandidateGarment[]>();
  for (const candidate of pool) {
    if (
      lockedCandidateIds.has(candidate.id) ||
      retainedPriorityIds.has(candidate.id)
    ) {
      continue;
    }
    const category =
      categorizeGarment(toClassifiableGarment(candidate)) ?? "other";
    const list = groups.get(category) ?? [];
    list.push(candidate);
    groups.set(category, list);
  }
  for (const [category, list] of groups) {
    if (POOL_CATEGORY_ORDER.includes(category)) {
      groups.set(category, orderByQualityWithRandomTies(list, random));
    } else {
      list.sort((a, b) => candidateQualityScore(b) - candidateQualityScore(a));
    }
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
  const capped: CandidateGarment[] = [...locked, ...retainedPriority];
  const cappedIds = new Set(capped.map((candidate) => candidate.id));
  const taken = new Map<string, number>();
  for (const candidate of retainedPriority) {
    const category =
      categorizeGarment(toClassifiableGarment(candidate)) ?? "other";
    taken.set(category, (taken.get(category) ?? 0) + 1);
  }
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
