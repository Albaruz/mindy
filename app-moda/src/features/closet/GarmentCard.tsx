"use client";

import { Pencil, Sparkles, Trash2 } from "lucide-react";
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
    <article className={styles.garmentCard}>
      {garment.imageUrl !== null ? (
        <img
          src={garment.imageUrl}
          alt={imageAlt}
          loading="lazy"
          className={styles["garmentCard__image"]}
        />
      ) : (
        <div className={styles["garmentCard__placeholder"]} aria-hidden="true" />
      )}
      {onDelete && (
        <button
          type="button"
          aria-label={ta("deleteGarment", { name: displayType })}
          className={cn(
            styles["garmentCard__action"],
            styles["garmentCard__action--topLeft"],
            styles["iconButton"]
          )}
          disabled={isDeleting}
          onClick={() => onDelete(garment)}
        >
          <Trash2 aria-hidden="true" size={18} className={styles["iconButton__icon"]} />
        </button>
      )}
      {onWash && (
        <button
          type="button"
          aria-label={ta("washGarment", { name: displayType })}
          className={cn(
            styles["garmentCard__action"],
            styles["garmentCard__action--topRight"],
            styles["iconButton"]
          )}
          disabled={isWashing}
          onClick={() => onWash(garment)}
        >
          <Sparkles aria-hidden="true" size={18} className={styles["iconButton__icon"]} />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          aria-label={ta("editGarment", { name: displayType })}
          className={cn(
            styles["garmentCard__action"],
            styles["garmentCard__action--topRight"],
            styles["iconButton"]
          )}
          onClick={() => onEdit(garment)}
        >
          <Pencil aria-hidden="true" size={18} className={styles["iconButton__icon"]} />
        </button>
      )}
      <div className={styles["garmentCard__body"]}>
        <h2 className={styles["garmentCard__title"]}>{displayType}</h2>
        {subtitle !== "" && <p className={styles["garmentCard__meta"]}>{subtitle}</p>}
      </div>
    </article>
  );
}