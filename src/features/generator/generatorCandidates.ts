import type { Garment } from "@/types/garment";
import { isWearableGarment } from "@/lib/garment/categorizeGarments";

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
  forcedFavoriteIds: Set<string> = new Set(),
): Garment[] {
  return garments.filter((garment) => {
    if (lockedIds.has(garment.garmentId)) {
      return true;
    }
    const isAvailable = isWearableGarment(garment);
    return (
      isAvailable &&
      (forcedFavoriteIds.has(garment.garmentId) ||
        !dismissedIds.has(garment.garmentId))
    );
  });
}
