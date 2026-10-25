"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/Button/Button";
import { GarmentCard } from "@/components/GarmentCard/GarmentCard";
import { useGeneratorStore } from "./useGeneratorStore";
import { useFavoritesQuery } from "@/features/closet/useFavoritesQuery";
import { useGarmentCardContent } from "@/lib/garment/useGarmentCardContent";
import {
  categorizeGarments,
  isWearableGarment,
} from "@/lib/garment/categorizeGarments";
import type { Category, Garment } from "@/types/garment";
import styles from "./FavoritesSelectionStep.module.scss";

const CATEGORIES_ORDER: Category[] = ["top", "bottom", "footwear", "outerwear"];

const CATEGORY_LABELS: Record<Category, string> = {
  top: "carousels.top",
  bottom: "carousels.bottom",
  footwear: "carousels.footwear",
  outerwear: "carousels.outerwear",
};

interface FavoriteGarmentOptionProps {
  garment: Garment;
  onSelect: (garmentId: string) => void;
}

function FavoriteGarmentOption({ garment, onSelect }: FavoriteGarmentOptionProps) {
  const ta = useTranslations("Accessibility");
  const { title, subtitle, imageAlt } = useGarmentCardContent(garment);

  return (
    <div role="listitem">
      <GarmentCard
        image={{ src: garment.imageUrl, alt: imageAlt }}
        title={title}
        subtitle={subtitle}
        onSelect={() => onSelect(garment.garmentId)}
        selectLabel={ta("selectGarment", { name: title })}
      />
    </div>
  );
}

interface FavoritesSelectionStepProps {
  onSelect: (garmentId: string) => void;
  onBack: () => void;
}

export function FavoritesSelectionStep({ onSelect, onBack }: FavoritesSelectionStepProps) {
  const t = useTranslations("Generator");
  const ta = useTranslations("Accessibility");
  const { data: favorites = [] } = useFavoritesQuery();

  const lookStyle = useGeneratorStore((state) => state.lookStyle);

  const favoritesWithImages = useMemo(
    () =>
      favorites.filter(
        (garment) => garment.imageUrl !== null && isWearableGarment(garment),
      ),
    [favorites],
  );

  const favoritesByCategory = useMemo(() => {
    return categorizeGarments(favoritesWithImages) as Record<
      Category,
      typeof favoritesWithImages
    >;
  }, [favoritesWithImages]);

  const handleSelectFavorite = (garmentId: string) => {
    onSelect(garmentId);
  };

  const hasFavorites = favoritesWithImages.length > 0;

  return (
    <div className={styles["favorites-selection-step"]} data-testid="generator-favorites-selection">
      <header className={styles["favorites-selection-step__header"]}>
        <Button
          type="button"
          variant="ghost"
          iconOnly
          aria-label={ta("back")}
          onClick={onBack}
          className={styles["favorites-selection-step__back-button"]}
        >
          <ChevronLeft aria-hidden="true" size={24} />
        </Button>
        <h1 className={styles["favorites-selection-step__title"]}>
          {t("favoritesSelectionTitle")}
        </h1>
        <div className={styles["favorites-selection-step__header-spacer"]} />
      </header>

      <p className={styles["favorites-selection-step__subtitle"]}>
        {t("favoritesSelectionSubtitle", { style: t(`styles.${lookStyle}`) })}
      </p>

      {!hasFavorites ? (
        <div className={styles["favorites-selection-step__empty"]} role="status">
          <p className={styles["favorites-selection-step__empty-text"]}>
            {t("favoritesPickerEmpty")}
          </p>
          <Button variant="ghost" onClick={onBack}>
            {t("favoritesPickerGoToCloset")}
          </Button>
        </div>
      ) : (
        <div className={styles["favorites-selection-step__content"]}>
          {CATEGORIES_ORDER.map((category) => {
            const garments = favoritesByCategory[category];
            if (!garments || garments.length === 0) return null;

            return (
              <section key={category} className={styles["favorites-selection-step__category"]} aria-labelledby={`category-${category}`}>
                <h2 id={`category-${category}`} className={styles["favorites-selection-step__category-title"]}>
                  <span className={styles["favorites-selection-step__category-name"]}>
                    {t(CATEGORY_LABELS[category])}
                  </span>
                  <span className={styles["favorites-selection-step__category-count"]}>{garments.length}</span>
                </h2>
                <div className={styles["favorites-selection-step__category-grid"]} role="list">
                  {garments.map((garment) => (
                    <FavoriteGarmentOption
                      key={garment.garmentId}
                      garment={garment}
                      onSelect={handleSelectFavorite}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
