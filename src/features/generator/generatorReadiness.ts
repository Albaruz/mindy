import { REQUIRED_GENERATOR_CATEGORIES } from "@/constants/generator";
import type { Garment } from "@/types/garment";
import type { Category } from "@/types/garment";
import {
  categorizeGarment,
  isInLaundryGarment,
  isOnePieceGarment,
  isWashableGarment,
  isWearableGarment,
} from "@/lib/garment/categorizeGarments";

export type GeneratorReadiness =
  | { status: "ready" }
  | { status: "empty" }
  | { status: "laundry" }
  | { status: "missing"; categories: Category[] };

const REQUIRED_CATEGORIES: readonly Category[] = REQUIRED_GENERATOR_CATEGORIES;

function garmentCoversCategory(garment: Garment, category: Category): boolean {
  const garmentCategory = categorizeGarment(garment);
  return (
    garmentCategory === category ||
    (category === "bottom" && isOnePieceGarment(garment))
  );
}

function missingCategories(garments: Garment[]): Category[] {
  return REQUIRED_CATEGORIES.filter(
    (category) => !garments.some((garment) => garmentCoversCategory(garment, category)),
  );
}

export function getGeneratorReadiness(garments: Garment[]): GeneratorReadiness {
  if (garments.length === 0) {
    return { status: "empty" };
  }

  const cleanGarments = garments.filter(isWearableGarment);
  const cleanMissing = missingCategories(cleanGarments);
  if (cleanMissing.length === 0) {
    return { status: "ready" };
  }

  const hasDirtyWashableGarments = garments.some(isInLaundryGarment);
  const hasCleanRequiredGarment = garments.some(
    (garment) =>
      !garment.isDirty &&
      isWashableGarment(garment) &&
      REQUIRED_CATEGORIES.some((category) =>
        garmentCoversCategory(garment, category),
      ),
  );
  if (
    hasDirtyWashableGarments &&
    !hasCleanRequiredGarment
  ) {
    return { status: "laundry" };
  }

  const inventoryMissing = missingCategories(garments);
  if (inventoryMissing.length === 0) {
    return { status: "laundry" };
  }

  return { status: "missing", categories: inventoryMissing };
}
