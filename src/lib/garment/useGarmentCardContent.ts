import { useTranslations } from "next-intl";
import { useGarmentTranslator } from "@/lib/translateGarment";
import type { Garment } from "@/types/garment";

export interface GarmentCardContent {
  /** Human-readable garment type (falls back to the AI specific type). */
  title: string;
  /** "Color · Season" summary; empty when neither translates. */
  subtitle: string;
  /** Descriptive alt text combining title and subtitle. */
  imageAlt: string;
}

/**
 * Resolves the display strings every garment card needs.
 * Shared by the closet grid and the generator favorites picker so the
 * translation and fallback rules stay in one place.
 */
export function useGarmentCardContent(garment: Garment): GarmentCardContent {
  const { translate, translateDetail } = useGarmentTranslator();
  const t = useTranslations("Closet");

  const title =
    translate(garment.garmentType, "type") ??
    translateDetail(
      typeof garment.extraTags.specificType === "string"
        ? garment.extraTags.specificType
        : null,
    ) ??
    t("garmentFallback");

  const subtitle = [
    translate(garment.color, "color"),
    translate(garment.season, "season"),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  const imageAlt = subtitle !== "" ? `${title} (${subtitle})` : title;

  return { title, subtitle, imageAlt };
}
