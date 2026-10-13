import type { Garment } from "@/types/garment";
import { isLaundryExemptGarment } from "./categorizeGarments";

/**
 * Filters garments to build the candidate set for the recommender.
 *
 * Rules (shared by auto and manual flows):
 * - Dismissed garments are always excluded.
 * - Dirty tops/bottoms are excluded unless laundry-exempt (footwear, outerwear).
 * - Locked garments are always included (even if dirty or dismissed).
 */
export function buildCandidates(
  garments: Garment[],
  lockedIds: Set<string>,
  dismissedIds: Set<string>,
): Garment[] {
  return garments.filter(
    (garment) =>
      (!dismissedIds.has(garment.garmentId) &&
        (!garment.isDirty || isLaundryExemptGarment(garment))) ||
      lockedIds.has(garment.garmentId),
  );
}