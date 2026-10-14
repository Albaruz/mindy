import type { Garment } from "@/types/garment";
import { isLaundryExemptGarment } from "@/lib/garment/categorizeGarments";
import { API_ROUTES } from "@/constants/api";
import type { RecommenderProfile, Mood } from "./generatorTypes";
import type { LookStyle } from "./useGeneratorStore";

export interface RecommenderGarment extends Garment {
  // For API: dirty exempt garments (footwear, outerwear) are sent as clean
  // so the server never filters them out.
  isDirty: boolean;
}

export interface RecommenderRequest {
  garments: RecommenderGarment[];
  temperatureC: number;
  condition: string | null;
  dayLow: number | null;
  dayHigh: number | null;
  rainProbability: number | null;
  profile: RecommenderProfile | null;
  mood: Mood | null;
  style: LookStyle | null;
  locale: string;
  lockedGarmentIds: string[];
  dismissedGarmentIds: string[];
  // Wizard alias for hard constraints (manual flow).
  fixed_garments?: string[];
}

export interface RecommenderOption {
  garmentIds: string[];
  suitabilityRatio?: number;
  reason?: string;
}

export interface RecommenderResponse {
  options: RecommenderOption[];
  _isFallback?: boolean;
}

export async function callRecommender(
  request: RecommenderRequest,
): Promise<Response> {
  return fetch(API_ROUTES.recommender, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export function buildRecommenderGarments(
  candidates: Garment[],
): RecommenderGarment[] {
  return candidates.map((garment) =>
    garment.isDirty && isLaundryExemptGarment(garment)
      ? { ...garment, isDirty: false }
      : garment,
  );
}