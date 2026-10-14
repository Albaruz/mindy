import {
  HEAT_THRESHOLD_C,
  RAIN_EXPECTED_THRESHOLD,
  RAINY_CONDITIONS,
  isRainVulnerableMaterial,
} from "@/constants/weather";
import { categorizeGarment } from "@/lib/garment/categorizeGarments";
import { toClassifiableGarment } from "./request";
import type { CandidateGarment } from "./types";
// Strict business rule: above the heat threshold, winter garments never
// reach the LLM. The filter runs on the already-minimized candidate list,
// so excluded items are never serialized into the prompt.
export function applyHeatRule(
  candidates: CandidateGarment[],
  temperatureC: number,
): { kept: CandidateGarment[]; excludedWinterCount: number } {
  if (temperatureC <= HEAT_THRESHOLD_C) {
    return { kept: candidates, excludedWinterCount: 0 };
  }
  const kept = candidates.filter(
    (candidate) => (candidate.season ?? "").toLowerCase() !== "winter",
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
