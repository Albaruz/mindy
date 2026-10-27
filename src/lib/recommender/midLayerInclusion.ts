import { MID_LAYER_LOOK_INCLUSION_PROBABILITY } from "@/constants/generator";
import { categorizeGarment } from "@/lib/garment/categorizeGarments";
import { isWarmUpperGarment } from "./seasonalRules";
import { toClassifiableGarment } from "./request";
import type { CandidateGarment, OutfitOption } from "./types";

type RandomSource = () => number;

function isMidLayer(candidate: CandidateGarment | undefined): boolean {
  return (
    candidate !== undefined &&
    categorizeGarment(toClassifiableGarment(candidate)) === "mid_layer"
  );
}

/**
 * Gates each selected mid-layer with an independent per-option chance. It does
 * not invent or substitute garments, so the stylist's compatibility choices remain intact.
 * Explicitly locked layers always stay in the look.
 */
export function applyMidLayerInclusionChance(
  options: OutfitOption[],
  candidates: CandidateGarment[],
  lockedIds: Set<string>,
  probability = MID_LAYER_LOOK_INCLUSION_PROBABILITY,
  random: RandomSource = Math.random,
  coldWeather = false,
): OutfitOption[] {
  if (options.length === 0) {
    return options;
  }

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const midLayerCandidates = candidates.filter(
    (candidate) =>
      isMidLayer(candidate) &&
      (!candidate.isDirty || lockedIds.has(candidate.id)),
  );
  if (midLayerCandidates.length === 0) {
    return options;
  }

  const canKeepLayer = options.map((option) => {
    const selectedMidLayers = option.garmentIds.filter((id) =>
      isMidLayer(byId.get(id)),
    );
    const hasWarmUpper = option.garmentIds.some((id) => {
      const candidate = byId.get(id);
      return candidate !== undefined && isWarmUpperGarment(candidate);
    });
    return (
      selectedMidLayers.some((id) => lockedIds.has(id)) ||
      (coldWeather && hasWarmUpper ? false : random() < probability)
    );
  });

  const adjusted = options.map((option, index) => {
    if (canKeepLayer[index]) {
      return option;
    }
    const garmentIds = option.garmentIds.filter((id) => !isMidLayer(byId.get(id)));
    return garmentIds.length === option.garmentIds.length
      ? option
      : { ...option, garmentIds };
  });

  const optionalLayeredIndices = adjusted.flatMap((option, index) => {
    const selectedMidLayers = option.garmentIds.filter((id) =>
      isMidLayer(byId.get(id)),
    );
    return selectedMidLayers.length > 0 &&
      !selectedMidLayers.some((id) => lockedIds.has(id))
      ? [index]
      : [];
  });

  // When every generated option has an optional layer, keep at least one
  // layer-free alternative. Locked user selections are never removed.
  if (
    !coldWeather &&
    options.length > 1 &&
    optionalLayeredIndices.length === options.length
  ) {
    const dropIndex = optionalLayeredIndices[
      Math.min(
        optionalLayeredIndices.length - 1,
        Math.floor(random() * optionalLayeredIndices.length),
      )
    ];
    if (dropIndex !== undefined) {
      const option = adjusted[dropIndex];
      if (option !== undefined) {
        adjusted[dropIndex] = {
          ...option,
          garmentIds: option.garmentIds.filter(
            (id) => !isMidLayer(byId.get(id)),
          ),
        };
      }
    }
  }

  // Keep the stylist's chosen mid-layer rather than swapping in an unrelated
  // one. If the same piece was reused, omit it from later options when a
  // different compatible choice was not provided.
  const usedMidLayerIds = new Set<string>();
  return adjusted.map((option) => {
    const selectedMidLayers = option.garmentIds.filter((id) =>
      isMidLayer(byId.get(id)),
    );
    if (selectedMidLayers.length === 0) {
      return option;
    }
    if (selectedMidLayers.some((id) => lockedIds.has(id))) {
      return option;
    }
    if (
      !coldWeather &&
      selectedMidLayers.some((id) => usedMidLayerIds.has(id))
    ) {
      return {
        ...option,
        garmentIds: option.garmentIds.filter(
          (id) => !isMidLayer(byId.get(id)),
        ),
      };
    }
    selectedMidLayers.forEach((id) => usedMidLayerIds.add(id));
    return option;
  });
}
