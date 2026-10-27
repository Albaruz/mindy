import { WARM_GARMENT_MATERIAL_VALUES } from "@/constants/garment";
import {
  categorizeGarment,
  isOnePieceGarment,
} from "@/lib/garment/categorizeGarments";
import { toClassifiableGarment } from "./request";
import type { CandidateGarment } from "./types";

export function isUpperOrOnePiece(candidate: CandidateGarment): boolean {
  const garment = toClassifiableGarment(candidate);
  return (
    categorizeGarment(garment) === "top" || isOnePieceGarment(garment)
  );
}

/** Winter-tagged or intrinsically warm upper garments do not need a mid-layer. */
export function isWarmUpperGarment(candidate: CandidateGarment): boolean {
  if (!isUpperOrOnePiece(candidate)) {
    return false;
  }
  if (candidate.season?.toLowerCase() === "winter") {
    return true;
  }
  return (
    candidate.material !== null &&
    (WARM_GARMENT_MATERIAL_VALUES as readonly string[]).includes(
      candidate.material.toLowerCase(),
    )
  );
}

/** A non-warm upper needs a mid-layer in cold weather when one is available. */
export function requiresMidLayerForColdUpper(
  candidate: CandidateGarment,
): boolean {
  return isUpperOrOnePiece(candidate) && !isWarmUpperGarment(candidate);
}
