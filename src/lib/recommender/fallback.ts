import {
  COLD_THRESHOLD_C,
  HEAT_THRESHOLD_C,
} from "@/constants/weather";
import { RECOMMENDER_FALLBACK_RATIOS } from "@/constants/generator";
import {
  categorizeGarment,
  isOnePieceGarment,
} from "@/lib/garment/categorizeGarments";
import type { GarmentSeason } from "@/types/garment";
import { toClassifiableGarment } from "./request";
import { requiresMidLayerForColdUpper } from "./seasonalRules";
import type { CandidateGarment, OutfitOption } from "./types";
// ---------------------------------------------------------------------------
// Local emergency stylist (graceful degradation): when Groq fails after
// its retries (quota, outage), the server still answers 200 with a
// rule-based look instead of a 502. Locked garments are hard constraints;
// picks prefer the current season and obey the color lifesaver rule.
// ---------------------------------------------------------------------------
const NEUTRAL_COLORS = ["white", "black", "gray", "beige", "navy"];

function isNeutralCandidate(candidate: CandidateGarment): boolean {
  // A garment counts as neutral when either its closed color or its
  // generic base color is neutral (blue jeans with a black base count).
  const tones = [candidate.color, candidate.colorBase].map((tone) =>
    (tone ?? "").toLowerCase(),
  );
  return tones.some((tone) => NEUTRAL_COLORS.includes(tone));
}

// Lower score = better season fit for the current temperature.
function seasonFitScore(
  season: GarmentSeason | null,
  temperatureC: number,
): number {
  if (temperatureC >= HEAT_THRESHOLD_C) {
    return season === "summer" || season === "all" ? 0 : 1;
  }
  if (temperatureC <= COLD_THRESHOLD_C) {
    return season === "winter" ||
      season === "mid_season" ||
      season === "all"
      ? 0
      : 1;
  }
  return season === "all" || season === "mid_season" ? 0 : 1;
}

function shuffled<T>(entries: T[]): T[] {
  const copy = [...entries];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[pick]] = [copy[pick], copy[index]];
  }
  return copy;
}

// Best pick of a category: locked pins win, then season fit, then chance.
function pickCandidate(
  candidates: CandidateGarment[],
  lockedIds: Set<string>,
  temperatureC: number,
): CandidateGarment | null {
  const locked = candidates.filter((candidate) =>
    lockedIds.has(candidate.id),
  );
  if (locked.length > 0) {
    return locked[0];
  }
  const ranked = shuffled(candidates).sort(
    (a, b) =>
      seasonFitScore(a.season, temperatureC) -
      seasonFitScore(b.season, temperatureC),
  );
  return ranked[0] ?? null;
}

function categoryOf(candidate: CandidateGarment) {
  return categorizeGarment(toClassifiableGarment(candidate));
}

export function generateFallbackLook(
  pool: CandidateGarment[],
  lockedIds: Set<string>,
  temperatureC: number,
  requireOuterwear: boolean,
): OutfitOption[] {
  const coldWeather = temperatureC <= COLD_THRESHOLD_C;
  const hasMidLayer = pool.some(
    (candidate) => categoryOf(candidate) === "mid_layer",
  );
  const seasonallyEligible = pool.filter((candidate) => {
    if (!coldWeather || lockedIds.has(candidate.id)) {
      return true;
    }

    const garment = toClassifiableGarment(candidate);
    const category = categorizeGarment(garment);
    if (category === "bottom" && candidate.season?.toLowerCase() === "summer") {
      return false;
    }
    if (category === "top" || isOnePieceGarment(garment)) {
      return !requiresMidLayerForColdUpper(candidate) || hasMidLayer;
    }
    return true;
  });
  const byCategory = new Map<string, CandidateGarment[]>();
  for (const candidate of seasonallyEligible) {
    const category = categoryOf(candidate);
    if (category === null) {
      continue;
    }
    const list = byCategory.get(category) ?? [];
    list.push(candidate);
    byCategory.set(category, list);
  }

  const options: OutfitOption[] = [];
  const seen = new Set<string>();
  const lockedBottoms = (byCategory.get("bottom") ?? []).filter((candidate) =>
    lockedIds.has(candidate.id),
  );
  const lockedOnePieceTops = (byCategory.get("top") ?? []).filter(
    (candidate) =>
      lockedIds.has(candidate.id) &&
      isOnePieceGarment(toClassifiableGarment(candidate)),
  );
  if (lockedBottoms.length > 0 && lockedOnePieceTops.length > 0) {
    throw new Error("Conflicting one-piece and bottom constraints.");
  }

  for (let round = 0; round < 3; round += 1) {
    const topCandidates =
      lockedBottoms.length > 0
        ? (byCategory.get("top") ?? []).filter(
            (candidate) =>
              lockedIds.has(candidate.id) ||
              !isOnePieceGarment(toClassifiableGarment(candidate)),
          )
        : byCategory.get("top") ?? [];
    const top = pickCandidate(topCandidates, lockedIds, temperatureC);
    if (!top) {
      break;
    }
    const ids = [top.id];
    // One-piece tops cover the bottom: never append trousers to a dress.
    const onePiece = isOnePieceGarment(toClassifiableGarment(top));
    if (!onePiece) {
      let bottoms = byCategory.get("bottom") ?? [];
      // Color lifesaver: a loud top demands a neutral bottom.
      if (!isNeutralCandidate(top)) {
        const neutrals = bottoms.filter(isNeutralCandidate);
        if (neutrals.length > 0) {
          bottoms = neutrals;
        }
      }
      const bottom = pickCandidate(bottoms, lockedIds, temperatureC);
      if (!bottom) {
        break;
      }
      ids.push(bottom.id);
    }
    const footwear = pickCandidate(
      byCategory.get("footwear") ?? [],
      lockedIds,
      temperatureC,
    );
    if (footwear) {
      ids.push(footwear.id);
    }
    const lockedMidLayer = (byCategory.get("mid_layer") ?? []).some((candidate) =>
      lockedIds.has(candidate.id),
    );
    if (lockedMidLayer || (coldWeather && requiresMidLayerForColdUpper(top))) {
      const midLayer = pickCandidate(
        byCategory.get("mid_layer") ?? [],
        lockedIds,
        temperatureC,
      );
      if (midLayer) {
        ids.push(midLayer.id);
      }
    }
    if (
      requireOuterwear ||
      (byCategory.get("outerwear") ?? []).some((candidate) =>
        lockedIds.has(candidate.id),
      )
    ) {
      const outerwear = pickCandidate(
        byCategory.get("outerwear") ?? [],
        lockedIds,
        temperatureC,
      );
      if (outerwear) {
        ids.push(outerwear.id);
      }
    }
    const signature = [...ids].sort().join("|");
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    options.push({
      garmentIds: ids,
      suitabilityRatio: RECOMMENDER_FALLBACK_RATIOS[options.length] ?? 50,
      reason: "",
    });
    if (options.length >= 3) {
      break;
    }
  }
  if (options.length === 0) {
    throw new Error("No buildable outfit for local fallback.");
  }
  return options;
}
