"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Sparkles, WandSparkles } from "lucide-react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { BottomActionBar } from "@/components/BottomActionBar/BottomActionBar";
import { useClosetQuery } from "@/features/closet/useClosetQuery";
import { useProfileQuery } from "@/features/profile/useProfileQuery";
import type { Category } from "@/types/garment";
import { useGeneratorStore } from "./useGeneratorStore";
import {
  categorizeGarments,
  isOnePieceGarment,
  isWearableGarment,
} from "@/lib/garment/categorizeGarments";
import {
  getWeatherForDay,
  shouldShowOuterwear,
  useWeatherQuery,
} from "./useWeatherQuery";
import { useDismissGarment } from "./useDismissGarment";
import { useCombineLocked } from "./useCombineLocked";
import { useWearToday } from "./useWearToday";
import { usePlanTomorrow } from "./usePlanTomorrow";
import type { RecommenderProfile } from "./generatorTypes";
import type { Garment } from "@/types/garment";
import { CategoryCarousel } from "./CategoryCarousel";
import styles from "./ManualCarousels.module.scss";

const BASE_CAROUSELS: { category: Category }[] = [
  { category: "top" },
  { category: "bottom" },
  { category: "footwear" },
];

interface ManualCarouselsProps {
  imageLoading?: "lazy" | "eager";
  preloadAdjacent?: number;
  effect?: "slide" | "coverflow";
}

// Independent carousels occupying the full canvas. Mounting this view
// unmounts the zero state, and the store seeds every empty slot once.
// The way back to the start lives in the top menu (house control).
// Wizard ("Bloquear y Generar"): pinning the focused slide locks its
// carousel; the bottom bar combines around pins while locked carousels
// stay static and unlocked ones reload with suggestions first.
export function ManualCarousels({
  imageLoading = "lazy",
  preloadAdjacent = 1,
  effect = "coverflow",
}: ManualCarouselsProps) {
  const t = useTranslations("Generator");
  const ta = useTranslations("Accessibility");
  const { data: garments = [], isPending } = useClosetQuery();
  const { data: profile } = useProfileQuery();
  const { data: weather } = useWeatherQuery();
  const outfitDay = useGeneratorStore((state) => state.outfitDay);
  const slots = useGeneratorStore((state) => state.slots);
  const combineSuggestions = useGeneratorStore(
    (state) => state.combineSuggestions,
  );
  const toggleLockGarment = useGeneratorStore(
    (state) => state.toggleLockGarment,
  );
  const unlockAll = useGeneratorStore((state) => state.unlockAll);
  const setGarment = useGeneratorStore((state) => state.setGarment);
  const dismissGarment = useDismissGarment();
  const combineLocked = useCombineLocked();
  const wearToday = useWearToday();
  const planTomorrow = usePlanTomorrow();

  const cleanGarments = useMemo(
    () =>
      garments.filter(isWearableGarment),
    [garments],
  );
  const byCategory = useMemo(
    () => categorizeGarments(cleanGarments),
    [cleanGarments],
  );
  // Rank last "Combinar" suggestions first in unlocked carousels so the
  // 2-3 AI options lead each list. Locked carousels keep closet order.
  const orderedByCategory = useMemo(() => {
    const ordered: Record<Category, Garment[]> = {
      top: [...byCategory.top],
      bottom: [...byCategory.bottom],
      footwear: [...byCategory.footwear],
      outerwear: [...byCategory.outerwear],
    };
    for (const category of Object.keys(ordered) as Category[]) {
      const ranked = combineSuggestions[category];
      if (ranked === undefined || ranked.length === 0) {
        continue;
      }
      const rank = new Map(ranked.map((id, index) => [id, index] as const));
      ordered[category] = [...ordered[category]].sort((a, b) => {
        const rankA = rank.get(a.garmentId) ?? Number.MAX_SAFE_INTEGER;
        const rankB = rank.get(b.garmentId) ?? Number.MAX_SAFE_INTEGER;
        return rankA - rankB;
      });
    }
    return ordered;
  }, [byCategory, combineSuggestions]);
  const selectedWeather = getWeatherForDay(weather, outfitDay);
  const showOuterwear = shouldShowOuterwear(
    selectedWeather === null || weather === null || weather === undefined
      ? weather
      : { ...weather, ...selectedWeather },
    orderedByCategory.outerwear.length,
  );
  const topIsOnePiece = isOnePieceGarment(slots.top.garment);

  const recommenderProfile: RecommenderProfile | null =
    profile === null || profile === undefined
      ? null
      : {
          colorimetry: profile.colorimetry,
          morphology: profile.morphology,
          preferredFit: profile.preferredFit,
          lifestyle: profile.lifestyle,
        };

  useEffect(() => {
    const { slots: current, setGarment: assign } =
      useGeneratorStore.getState();
    for (const { category } of BASE_CAROUSELS) {
      if (
        current[category].garment === null &&
        orderedByCategory[category].length > 0
      ) {
        assign(category, orderedByCategory[category][0]);
      }
    }
    if (
      current.outerwear.garment === null &&
      orderedByCategory.outerwear.length > 0
    ) {
      assign("outerwear", orderedByCategory.outerwear[0]);
    }
  }, [orderedByCategory]);

  const handleSlideChange = (category: Category, index: number) => {
    const garment = orderedByCategory[category][index];
    if (garment !== undefined) {
      setGarment(category, garment);
    }
  };

  const handleToggleLock = (category: Category) => {
    toggleLockGarment(category, slots[category].garment ?? undefined);
  };

  const handleChangeGarment = (category: Category) => {
    void dismissGarment(category, orderedByCategory[category]);
  };

  const handleCombine = () => {
    if (combineLocked.isPending || garments.length === 0) {
      return;
    }
    combineLocked.mutate({ garments, profile: recommenderProfile });
  };

  // Canvas garments for the wear action, in slot order.
  const manualGarments = useMemo(
    () =>
      (Object.keys(slots) as (keyof typeof slots)[]).flatMap((category) =>
        slots[category].garment !== null ? [slots[category].garment] : [],
      ),
    [slots],
  );

  const handleWearManual = () => {
    if (
      manualGarments.length === 0 ||
      wearToday.isPending ||
      planTomorrow.isPending
    ) {
      return;
    }
    if (outfitDay === "today") {
      wearToday.mutate(manualGarments);
    } else {
      planTomorrow.mutate(manualGarments);
    }
  };

  const renderCarousel = (category: Category) => {
    const isLocked = slots[category].isLocked;
    return (
      <CategoryCarousel
        key={category}
        category={category}
        title={t(`carousels.${category}`)}
        garments={orderedByCategory[category]}
        activeGarmentId={slots[category].garment?.garmentId ?? null}
        isLocked={isLocked}
        // Locked carousels stay static during inference; unlocked ones
        // show skeletons until the suggestions land.
        isLoading={isPending || (combineLocked.isPending && !isLocked)}
        onSlideChange={handleSlideChange}
        onToggleLock={handleToggleLock}
        onChangeGarment={handleChangeGarment}
        imageLoading={imageLoading}
        preloadAdjacent={preloadAdjacent}
        effect={effect}
      />
    );
  };

  return (
    <div className={styles["manual-carousels"]} data-testid="generator-manual">
      <div className={styles["manual-carousels__carousels"]}>
        {showOuterwear ? renderCarousel("outerwear") : null}
        {BASE_CAROUSELS.filter(
          ({ category }) => !(category === "bottom" && topIsOnePiece),
        ).map(({ category }) => renderCarousel(category))}
      </div>
      <BottomActionBar
        label={ta("lookActions")}
        primaryLabel={
          outfitDay === "today" ? t("wear") : t("saveTomorrow")
        }
        onPrimary={handleWearManual}
        primaryDisabled={
          manualGarments.length === 0 ||
          wearToday.isPending ||
          planTomorrow.isPending
        }
        isPrimaryPending={wearToday.isPending || planTomorrow.isPending}
        left={{
          label: ta("resetLocks"),
          onClick: unlockAll,
          icon: <RotateCcw aria-hidden="true" size={22} />,
        }}
        right={{
          label: ta("combineLocked"),
          onClick: handleCombine,
          disabled: garments.length === 0 || combineLocked.isPending,
          icon: <WandSparkles aria-hidden="true" size={22} />,
        }}
        extraRight={{
          label: t("autoButton"),
          onClick: () => useGeneratorStore.getState().startAutoSelect(),
          icon: <Sparkles aria-hidden="true" size={22} />,
        }}
      />
    </div>
  );
}
