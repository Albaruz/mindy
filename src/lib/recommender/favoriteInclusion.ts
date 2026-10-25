import { FAVORITE_LOOK_INCLUSION_PROBABILITY } from "@/constants/generator";
import {
  categorizeGarment,
  isOnePieceGarment,
} from "@/lib/garment/categorizeGarments";
import {
  enforceVarietyAcrossOptions,
  filterValidOutfitOptions,
} from "./llmOptions";
import { toClassifiableGarment } from "./request";
import type { CandidateGarment, OutfitOption } from "./types";

type RandomSource = () => number;

function getCompatibilityGroup(candidate: CandidateGarment): string | null {
  const garment = toClassifiableGarment(candidate);
  const category = categorizeGarment(garment);
  return category === null
    ? null
    : `${category}:${isOnePieceGarment(garment) ? "one-piece" : "separates"}`;
}

/**
 * Chooses at most one optional favorite per replacement-compatible category.
 * Keeping this set small ensures favorites survive the recommender token cap
 * without turning them into hard constraints.
 */
export function selectSuggestedFavoriteIds(
  candidates: CandidateGarment[],
  requestedFavoriteIds: Set<string>,
  lockedIds: Set<string>,
  random: RandomSource = Math.random,
): Set<string> {
  const groups = new Map<string, CandidateGarment[]>();

  for (const candidate of candidates) {
    if (
      !requestedFavoriteIds.has(candidate.id) ||
      lockedIds.has(candidate.id) ||
      candidate.isDirty
    ) {
      continue;
    }
    const group = getCompatibilityGroup(candidate);
    if (group === null) continue;
    const favorites = groups.get(group) ?? [];
    favorites.push(candidate);
    groups.set(group, favorites);
  }

  const selected = new Set<string>();
  for (const favorites of groups.values()) {
    const index = Math.min(
      favorites.length - 1,
      Math.floor(random() * favorites.length),
    );
    const favorite = favorites[index];
    if (favorite) selected.add(favorite.id);
  }
  return selected;
}

/**
 * Independently gives each valid generated option a chance to swap one
 * unlocked garment for a compatible optional favorite. Style, weather,
 * hygiene, one-piece, outerwear, and cross-option variety rules remain intact.
 */
export function applyFavoriteInclusionChance(
  options: OutfitOption[],
  candidates: CandidateGarment[],
  lockedIds: Set<string>,
  suggestedFavoriteIds: Set<string>,
  requireOuterwear: boolean,
  probability = FAVORITE_LOOK_INCLUSION_PROBABILITY,
  random: RandomSource = Math.random,
): OutfitOption[] {
  if (options.length === 0 || suggestedFavoriteIds.size === 0) return options;

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const suggestedFavorites = candidates.filter(
    (candidate) =>
      suggestedFavoriteIds.has(candidate.id) &&
      !candidate.isDirty &&
      !lockedIds.has(candidate.id),
  );
  if (suggestedFavorites.length === 0) return options;

  const usedCategoryIds = new Map<string, Set<string>>();
  const rememberOption = (option: OutfitOption) => {
    for (const id of option.garmentIds) {
      const candidate = byId.get(id);
      if (!candidate || lockedIds.has(id)) continue;
      const category = categorizeGarment(toClassifiableGarment(candidate));
      if (category !== "top" && category !== "bottom") continue;
      const used = usedCategoryIds.get(category) ?? new Set<string>();
      used.add(id);
      usedCategoryIds.set(category, used);
    }
  };

  const adjusted = options.map((option) => {
    const currentCandidates = option.garmentIds
      .map((id) => byId.get(id))
      .filter((candidate): candidate is CandidateGarment => candidate !== undefined);
    const alreadyHasFavorite = currentCandidates.some((candidate) =>
      suggestedFavoriteIds.has(candidate.id),
    );
    if (alreadyHasFavorite) {
      const favoriteIds = currentCandidates
        .filter((candidate) => suggestedFavoriteIds.has(candidate.id))
        .map((candidate) => candidate.id);
      const favoriteCategories = new Set(
        favoriteIds.flatMap((id) => {
          const candidate = byId.get(id);
          const category = candidate
            ? categorizeGarment(toClassifiableGarment(candidate))
            : null;
          return category === null ? [] : [category];
        }),
      );
      const favoriteIdSet = new Set(favoriteIds);
      const normalizedOption = {
        ...option,
        // The client renders only the first garment in each category. Put
        // selected optional favorites first so they are the visible choice.
        garmentIds: [
          ...favoriteIds,
          ...option.garmentIds.filter((id) => {
            if (favoriteIdSet.has(id)) return false;
            const candidate = byId.get(id);
            if (!candidate) return true;
            const category = categorizeGarment(toClassifiableGarment(candidate));
            return category === null || !favoriteCategories.has(category);
          }),
        ],
      };
      rememberOption(normalizedOption);
      return normalizedOption;
    }

    const replacementChoices: Array<{
      index: number;
      favorite: CandidateGarment;
    }> = [];

    option.garmentIds.forEach((id, index) => {
      const current = byId.get(id);
      if (!current || lockedIds.has(id)) return;
      const currentGarment = toClassifiableGarment(current);
      const currentCategory = categorizeGarment(currentGarment);
      if (currentCategory === null) return;
      const currentIsOnePiece = isOnePieceGarment(currentGarment);

      for (const favorite of suggestedFavorites) {
        const favoriteGarment = toClassifiableGarment(favorite);
        if (categorizeGarment(favoriteGarment) !== currentCategory) continue;
        if (isOnePieceGarment(favoriteGarment) !== currentIsOnePiece) continue;
        if (
          (currentCategory === "top" || currentCategory === "bottom") &&
          usedCategoryIds.get(currentCategory)?.has(favorite.id)
        ) {
          continue;
        }
        replacementChoices.push({ index, favorite });
      }
    });

    if (
      replacementChoices.length === 0 ||
      random() >= probability
    ) {
      rememberOption(option);
      return option;
    }

    const choiceIndex = Math.min(
      replacementChoices.length - 1,
      Math.floor(random() * replacementChoices.length),
    );
    const choice = replacementChoices[choiceIndex];
    if (!choice) {
      rememberOption(option);
      return option;
    }

    const garmentIds = [...option.garmentIds];
    garmentIds[choice.index] = choice.favorite.id;
    const replacement = { ...option, garmentIds };
    const validReplacement = filterValidOutfitOptions(
      [replacement],
      candidates,
      lockedIds,
      requireOuterwear,
    )[0];
    if (!validReplacement) {
      rememberOption(option);
      return option;
    }

    rememberOption(validReplacement);
    return validReplacement;
  });

  return enforceVarietyAcrossOptions(adjusted, candidates, lockedIds);
}
