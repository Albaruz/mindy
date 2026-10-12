import { REQUIRED_GENERATOR_CATEGORIES } from "@/constants/generator";
import type { Garment } from "@/types/garment";
import type { Category } from "./useGeneratorStore";
import {
  categorizeGarment,
  isLaundryExemptGarment,
  isOnePieceGarment,
} from "./categorizeGarments";

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

  const cleanGarments = garments.filter(
    (garment) => !garment.isDirty || isLaundryExemptGarment(garment),
  );
  const cleanMissing = missingCategories(cleanGarments);
  if (cleanMissing.length === 0) {
    return { status: "ready" };
  }

  const hasDirtyWashableGarments = garments.some(
    (garment) => garment.isDirty && !isLaundryExemptGarment(garment),
  );
  const hasCleanRequiredGarment = garments.some(
    (garment) =>
      !garment.isDirty &&
      !isLaundryExemptGarment(garment) &&
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
