import {
  HEAT_THRESHOLD_C,
  RAIN_EXPECTED_THRESHOLD,
  RAINY_CONDITIONS,
  isRainVulnerableMaterial,
} from "@/constants/weather";
import {
  categorizeGarment,
  isOnePieceGarment,
} from "@/lib/garment/categorizeGarments";
import { toClassifiableGarment } from "./request";
import { requiresMidLayerForColdUpper } from "./seasonalRules";
import type { CandidateGarment, OutfitOption } from "./types";
// Above the heat threshold, winter garments stay out of the LLM context
// unless the user explicitly selected one as a favorite. The filter runs on
// the minimized candidate list, so excluded items are never serialized.
export function applyHeatRule(
  candidates: CandidateGarment[],
  temperatureC: number,
  hardConstraintIds: Set<string> = new Set(),
): { kept: CandidateGarment[]; excludedWinterCount: number } {
  if (temperatureC <= HEAT_THRESHOLD_C) {
    return { kept: candidates, excludedWinterCount: 0 };
  }
  const kept = candidates.filter(
    (candidate) =>
      hardConstraintIds.has(candidate.id) ||
      (candidate.season ?? "").toLowerCase() !== "winter",
  );
  return { kept, excludedWinterCount: candidates.length - kept.length };
}

// Rain-material rule (#BKL-001): silk spots and suede ruins in rain, so
// vulnerable candidates never reach the LLM on wet days. Explicit user
// pins (locked IDs) always survive: the user overrules the weather.
export function applyRainMaterialRule(
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
export function isRainyWeather(
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

export function poolHasOuterwear(pool: CandidateGarment[]): boolean {
  return pool.some(
    (candidate) =>
      categorizeGarment(toClassifiableGarment(candidate)) === "outerwear",
  );
}

/** Enforces the cold-weather contract for summer garments in generated looks. */
export function filterColdWeatherOutfitOptions(
  options: OutfitOption[],
  candidates: CandidateGarment[],
  lockedIds: Set<string>,
  coldWeather: boolean,
): OutfitOption[] {
  if (!coldWeather) {
    return options;
  }

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return options.filter((option) => {
    const selected = option.garmentIds
      .map((id) => byId.get(id))
      .filter((candidate): candidate is CandidateGarment => candidate !== undefined);
    const hasMidLayer = selected.some(
      (candidate) =>
        categorizeGarment(toClassifiableGarment(candidate)) === "mid_layer",
    );

    return selected.every((candidate) => {
      if (lockedIds.has(candidate.id)) {
        return true;
      }

      const garment = toClassifiableGarment(candidate);
      const category = categorizeGarment(garment);
      if (category === "bottom" && candidate.season?.toLowerCase() === "summer") {
        return false;
      }
      if (
        category !== "top" &&
        !isOnePieceGarment(garment)
      ) {
        return true;
      }
      return !requiresMidLayerForColdUpper(candidate) || hasMidLayer;
    });
  });
}
