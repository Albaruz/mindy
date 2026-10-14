"use client";

import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { GarmentImage } from "@/components/GarmentImage/GarmentImage";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Garment } from "@/types/garment";
import { useGarmentTranslator } from "@/lib/translateGarment";
import styles from "./GarmentCard.module.scss";

interface GarmentCardProps {
  garment: Garment;
  onEdit?: (garment: Garment) => void;
  onDelete?: (garment: Garment) => void;
  isDeleting?: boolean;
  onWash?: (garment: Garment) => void;
  isWashing?: boolean;
}

export function GarmentCard({
  garment,
  onEdit,
  onDelete,
  isDeleting = false,
  onWash,
  isWashing = false,
}: GarmentCardProps) {
  const { translate, translateDetail } = useGarmentTranslator();
  const t = useTranslations("Closet");
  const ta = useTranslations("Accessibility");
  const displayType =
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
  // Descriptive alternative (WCAG 1.1.1): type plus visible traits.
  const imageAlt = subtitle !== "" ? `${displayType} (${subtitle})` : displayType;

  return (
    <article className={styles["garment-card"]}>
      <GarmentImage
        src={garment.imageUrl}
        alt={imageAlt}
        className={styles["garment-card__image"]}
        placeholderClassName={styles["garment-card__placeholder"]}
      />
      {onDelete && (
        <button
          type="button"
          aria-label={ta("deleteGarment", { name: displayType })}
          className={cn(
            styles["garment-card__action"],
            styles["garment-card__action--top-left"],
            styles["icon-button"]
          )}
          disabled={isDeleting}
          onClick={() => onDelete(garment)}
        >
          <Trash2 aria-hidden="true" size={18} className={styles["icon-button__icon"]} />
        </button>
      )}
      {onWash && (
        <button
          type="button"
          aria-label={ta("washGarment", { name: displayType })}
          className={cn(
            styles["garment-card__action"],
            styles["garment-card__action--top-right"],
            styles["icon-button"]
          )}
          disabled={isWashing}
          onClick={() => onWash(garment)}
        >
          <Sparkles aria-hidden="true" size={18} className={styles["icon-button__icon"]} />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          aria-label={ta("editGarment", { name: displayType })}
          className={cn(
            styles["garment-card__action"],
            styles["garment-card__action--top-right"],
            styles["icon-button"]
          )}
          onClick={() => onEdit(garment)}
        >
          <Pencil aria-hidden="true" size={18} className={styles["icon-button__icon"]} />
        </button>
      )}
      <div className={styles["garment-card__body"]}>
        <h2 className={styles["garment-card__title"]}>{displayType}</h2>
        {subtitle !== "" && <p className={styles["garment-card__meta"]}>{subtitle}</p>}
      </div>
    </article>
  );
}