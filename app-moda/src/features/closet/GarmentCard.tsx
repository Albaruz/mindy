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
  // Laundry action for the dirty-basket view: circular sparkle button.
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
  const imageAlt =
    subtitle !== "" ? `${displayType} (${subtitle})` : displayType;

  return (
    <article className={styles.card}>
      {garment.imageUrl !== null ? (
        <img
          src={garment.imageUrl}
          alt={imageAlt}
          loading="lazy"
          className={styles.image}
        />
      ) : (
        <div className={styles.placeholder} aria-hidden="true" />
      )}
      {onDelete ? (
        <button
          type="button"
          aria-label={ta("deleteGarment", { name: displayType })}
          className={cn(styles.iconButton, styles.topLeft)}
          disabled={isDeleting}
          onClick={() => onDelete(garment)}
        >
          <Trash2 aria-hidden="true" size={18} />
        </button>
      ) : null}
      {onWash ? (
        <button
          type="button"
          aria-label={ta("washGarment", { name: displayType })}
          className={cn(styles.iconButton, styles.topRight)}
          disabled={isWashing}
          onClick={() => onWash(garment)}
        >
          <Sparkles aria-hidden="true" size={18} />
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          aria-label={ta("editGarment", { name: displayType })}
          className={cn(styles.iconButton, styles.topRight)}
          onClick={() => onEdit(garment)}
        >
          <Pencil aria-hidden="true" size={18} />
        </button>
      ) : null}
      <div className={styles.body}>
        <h2 className={styles.title}>{displayType}</h2>
        {subtitle !== "" ? <p className={styles.meta}>{subtitle}</p> : null}
      </div>
    </article>
  );
}
