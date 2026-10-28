import { MID_LAYER_LOOK_INCLUSION_PROBABILITY } from "@/constants/generator";
import { applyFavoriteInclusionChance } from "./favoriteInclusion";
import { applyMidLayerInclusionChance } from "./midLayerInclusion";
import { completeOutfitOptions } from "./outfitCompletion";
import { enforceVarietyAcrossOptions } from "./llmOptions";
import { filterColdWeatherOutfitOptions } from "./weatherRules";
import type { CandidateGarment, OutfitOption } from "./types";

export interface FinalizeOutfitOptionsInput {
  options: OutfitOption[];
  candidates: CandidateGarment[];
  lockedIds: Set<string>;
  suggestedFavoriteIds: Set<string>;
  outerwearRequired: boolean;
  coldWeather: boolean;
}

/** Applies the same weather, variety, completion, favorite, and layering rules
 * to JSON, streamed, structured-recovery, and local-fallback recommendations.
 */
export function finalizeOutfitOptions({
  options,
  candidates,
  lockedIds,
  suggestedFavoriteIds,
  outerwearRequired,
  coldWeather,
}: FinalizeOutfitOptionsInput): OutfitOption[] {
  const weatherSafe = filterColdWeatherOutfitOptions(
    options,
    candidates,
    lockedIds,
    coldWeather,
  );
  const varied = enforceVarietyAcrossOptions(weatherSafe, candidates, lockedIds);
  const complete = completeOutfitOptions(
    varied,
    candidates,
    lockedIds,
    outerwearRequired,
    coldWeather,
  );
  const withFavorites = applyFavoriteInclusionChance(
    complete,
    candidates,
    lockedIds,
    suggestedFavoriteIds,
    outerwearRequired,
  );
  const weatherSafeFavorites = filterColdWeatherOutfitOptions(
    withFavorites,
    candidates,
    lockedIds,
    coldWeather,
  );
  const refilled = completeOutfitOptions(
    weatherSafeFavorites,
    candidates,
    lockedIds,
    outerwearRequired,
    coldWeather,
  );

  return applyMidLayerInclusionChance(
    refilled,
    candidates,
    lockedIds,
    coldWeather ? 1 : MID_LAYER_LOOK_INCLUSION_PROBABILITY,
    Math.random,
    coldWeather,
  );
}
