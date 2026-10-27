import {
  MAX_LOOK_OPTIONS,
  RECOMMENDER_FALLBACK_RATIOS,
} from "@/constants/generator";
import {
  categorizeGarment,
  isOnePieceGarment,
} from "@/lib/garment/categorizeGarments";
import { filterValidOutfitOptions } from "./llmOptions";
import { toClassifiableGarment } from "./request";
import {
  isWarmUpperGarment,
  requiresMidLayerForColdUpper,
} from "./seasonalRules";
import type { CandidateGarment, OutfitOption } from "./types";

function categoryOf(candidate: CandidateGarment) {
  return categorizeGarment(toClassifiableGarment(candidate));
}

function collectUsedIds(
  options: OutfitOption[],
  candidatesById: Map<string, CandidateGarment>,
  category: "top" | "bottom",
  lockedIds: Set<string>,
): Set<string> {
  const used = new Set<string>();
  for (const option of options) {
    for (const id of option.garmentIds) {
      const candidate = candidatesById.get(id);
      if (
        candidate !== undefined &&
        !lockedIds.has(id) &&
        categoryOf(candidate) === category
      ) {
        used.add(id);
      }
    }
  }
  return used;
}

/**
 * Completes short, valid LLM responses with distinct compatible combinations
 * from the already style-, weather- and cleanliness-filtered candidate pool.
 */
export function completeOutfitOptions(
  initialOptions: OutfitOption[],
  candidates: CandidateGarment[],
  lockedIds: Set<string>,
  requireOuterwear: boolean,
  coldWeather = false,
): OutfitOption[] {
  const options = [...initialOptions].slice(0, MAX_LOOK_OPTIONS);
  if (options.length >= MAX_LOOK_OPTIONS) {
    return options;
  }

  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const byCategory = new Map<string, CandidateGarment[]>();
  for (const candidate of candidates) {
    const category = categoryOf(candidate);
    if (category === null) continue;
    const group = byCategory.get(category) ?? [];
    group.push(candidate);
    byCategory.set(category, group);
  }

  const lockedByCategory = new Map<string, CandidateGarment[]>();
  for (const id of lockedIds) {
    const candidate = candidatesById.get(id);
    const category = candidate ? categoryOf(candidate) : null;
    if (candidate === undefined || category === null) continue;
    const group = lockedByCategory.get(category) ?? [];
    group.push(candidate);
    lockedByCategory.set(category, group);
  }

  // Multiple hard pins in a single visual slot are not safely completable by
  // a one-garment-per-slot canvas, so keep the valid options we already have.
  for (const category of ["top", "bottom", "mid_layer", "outerwear"]) {
    if ((lockedByCategory.get(category)?.length ?? 0) > 1) {
      return options;
    }
  }

  const lockedTop = lockedByCategory.get("top")?.[0];
  const lockedBottom = lockedByCategory.get("bottom")?.[0];
  const lockedOuterwear = lockedByCategory.get("outerwear")?.[0];
  const midLayers = byCategory.get("mid_layer") ?? [];
  const isSummer = (candidate: CandidateGarment) =>
    candidate.season?.toLowerCase() === "summer";
  const tops = lockedTop
    ? [lockedTop]
    : [...(byCategory.get("top") ?? [])]
        .filter(
          (candidate) =>
            !coldWeather ||
            !requiresMidLayerForColdUpper(candidate) ||
            midLayers.length > 0,
        )
        .sort((a, b) => {
          const rank = (candidate: CandidateGarment) =>
            isWarmUpperGarment(candidate)
              ? 0
              : isSummer(candidate)
                ? 2
                : 1;
          return rank(a) - rank(b);
        });
  const bottoms = lockedBottom
    ? [lockedBottom]
    : (byCategory.get("bottom") ?? []).filter(
        (candidate) => !coldWeather || !isSummer(candidate),
      );
  const footwear = byCategory.get("footwear") ?? [];
  const outerwear = lockedOuterwear
    ? [lockedOuterwear]
    : (byCategory.get("outerwear") ?? []);
  if (requireOuterwear && outerwear.length === 0) {
    return options;
  }

  const usedTops = collectUsedIds(options, candidatesById, "top", lockedIds);
  const usedBottoms = collectUsedIds(options, candidatesById, "bottom", lockedIds);
  const signatures = new Set(
    options.map((option) => [...option.garmentIds].sort().join("|")),
  );

  for (const top of tops) {
    if (options.length >= MAX_LOOK_OPTIONS) break;
    if (!lockedIds.has(top.id) && usedTops.has(top.id)) continue;
    const onePiece = isOnePieceGarment(toClassifiableGarment(top));
    if (onePiece && lockedBottom) continue;

    const compatibleBottoms = onePiece
      ? [undefined]
      : bottoms.filter(
          (bottom) => lockedIds.has(bottom.id) || !usedBottoms.has(bottom.id),
        );
    if (!onePiece && compatibleBottoms.length === 0) continue;

    for (const bottom of compatibleBottoms) {
      if (options.length >= MAX_LOOK_OPTIONS) break;
      const ids = [...lockedIds];
      if (!ids.includes(top.id)) ids.push(top.id);
      if (bottom !== undefined && !ids.includes(bottom.id)) ids.push(bottom.id);

      if (
        coldWeather &&
        !lockedIds.has(top.id) &&
        requiresMidLayerForColdUpper(top) &&
        !lockedByCategory.has("mid_layer") &&
        midLayers.length > 0
      ) {
        const midLayer = midLayers[options.length % midLayers.length];
        if (midLayer && !ids.includes(midLayer.id)) ids.push(midLayer.id);
      }

      if (!lockedByCategory.has("footwear") && footwear.length > 0) {
        const shoe = footwear[options.length % footwear.length];
        if (shoe && !ids.includes(shoe.id)) ids.push(shoe.id);
      }
      if (requireOuterwear && !lockedOuterwear) {
        const coat = outerwear[options.length % outerwear.length];
        if (coat && !ids.includes(coat.id)) ids.push(coat.id);
      }

      const signature = [...ids].sort().join("|");
      if (signatures.has(signature)) continue;

      const option: OutfitOption = {
        garmentIds: ids,
        suitabilityRatio:
          RECOMMENDER_FALLBACK_RATIOS[
            options.length % RECOMMENDER_FALLBACK_RATIOS.length
          ] ?? 50,
        reason: "",
      };
      const valid = filterValidOutfitOptions(
        [option],
        candidates,
        lockedIds,
        requireOuterwear,
      )[0];
      if (valid === undefined) continue;

      options.push(valid);
      signatures.add(signature);
      if (!lockedIds.has(top.id)) usedTops.add(top.id);
      if (bottom !== undefined && !lockedIds.has(bottom.id)) {
        usedBottoms.add(bottom.id);
      }
      if (!lockedIds.has(top.id)) {
        break;
      }
    }
  }

  return options;
}
