import type { ReactNode } from "react";
import { GarmentImage } from "@/components/GarmentImage/GarmentImage";
import { cn } from "@/lib/utils";
import styles from "./GarmentCard.module.scss";

interface GarmentCardBaseProps {
  /** Garment photo and its descriptive alternative. */
  image: { src: string | null; alt: string };
  title: string;
  subtitle?: string;
  /** Overlay action aligned to the inline start (e.g. favorite). */
  leadingAction?: ReactNode;
  /** Overlay action(s) aligned to the inline end (e.g. wash, edit). */
  trailingAction?: ReactNode;
  className?: string;
}

type GarmentCardSelectionProps =
  | { onSelect?: undefined; selectLabel?: undefined }
  | { onSelect: () => void; selectLabel: string };

export type GarmentCardProps = GarmentCardBaseProps & GarmentCardSelectionProps;

/**
 * Presentational garment card shared by closet and generator.
 * Domain logic (favorites, washing, selection state) stays in the caller:
 * pass display strings, optional action slots and, when the whole card must be
 * activatable, `onSelect` + its accessible label.
 */
export function GarmentCard({
  image,
  title,
  subtitle,
  leadingAction,
  trailingAction,
  onSelect,
  selectLabel,
  className,
}: GarmentCardProps) {
  return (
    <article
      className={cn(
        styles["garment-card"],
        onSelect !== undefined && styles["garment-card--selectable"],
        className,
      )}
    >
      <GarmentImage
        src={image.src}
        alt={image.alt}
        className={styles["garment-card__image"]}
        placeholderClassName={styles["garment-card__placeholder"]}
      />
      {leadingAction !== undefined && (
        <div
          className={cn(
            styles["garment-card__action"],
            styles["garment-card__action--leading"],
          )}
        >
          {leadingAction}
        </div>
      )}
      {trailingAction !== undefined && (
        <div
          className={cn(
            styles["garment-card__action"],
            styles["garment-card__action--trailing"],
          )}
        >
          {trailingAction}
        </div>
      )}
      {onSelect !== undefined && (
        <button
          type="button"
          aria-label={selectLabel}
          className={styles["garment-card__select"]}
          onClick={onSelect}
        />
      )}
      <div className={styles["garment-card__body"]}>
        <h2 className={styles["garment-card__title"]}>{title}</h2>
        {subtitle !== undefined && subtitle !== "" && (
          <p className={styles["garment-card__meta"]}>{subtitle}</p>
        )}
      </div>
    </article>
  );
}
