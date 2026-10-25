"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "framer-motion";
import { X, ChevronLeft } from "lucide-react";
import { SmartSkeleton } from "@/components/Skeletons/SmartSkeleton";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { BottomActionBar } from "@/components/BottomActionBar/BottomActionBar";
import { Button } from "@/components/Button/Button";
import { useRouter } from "@/i18n/navigation";
import { useClosetQuery } from "@/features/closet/hooks/queries/useClosetQuery";
import { useDoLaundry } from "@/features/profile/hooks/laundry/useDoLaundry";
import { useProfileQuery } from "@/features/profile/hooks/profile/useProfileQuery";
import { useGeneratorStore } from "../../state/generator-store/useGeneratorStore";
import { MAX_DISCARD_COUNT } from "@/constants/generator";
import {
  getWeatherForDay,
  shouldShowOuterwear,
  useWeatherQuery,
} from "../../hooks/weather/useWeatherQuery";
import { useGenerateLooks } from "../../hooks/generation/useGenerateLooks";
import { useWearToday } from "../../hooks/outfit-actions/useWearToday";
import { usePlanTomorrow } from "../../hooks/outfit-actions/usePlanTomorrow";
import type { RecommenderProfile } from "../../domain/recommendations/generatorTypes";
import { categorizeGarments, isWearableGarment } from "@/lib/garment/categorizeGarments";
import { ZeroState } from "../../components/states/zero-state/ZeroState";
import { StyleStep } from "../../components/flow/style-step/StyleStep";
import { LookShowcase, ShowcaseEmptyState } from "../../components/showcase/look-showcase/LookShowcase";
import { InsufficientStyleEmpty } from "../../components/states/insufficient-style-empty/InsufficientStyleEmpty";
import { ShowcaseCard } from "../../components/showcase/showcase-card/ShowcaseCard";
import type { AiLook } from "../../state/generator-store/useGeneratorStore";
import { getGeneratorReadiness } from "../../domain/recommendations/generatorReadiness";
import { useFavoritesQuery } from "@/features/closet/hooks/queries/useFavoritesQuery";
import { FavoritesSelectionStep } from "../../components/flow/favorites-selection-step/FavoritesSelectionStep";
import styles from "./Home.module.scss";

// Swiper carousels are heavy: split them so the zero state stays instant.
// The loading fallback is translated inside its own component (hooks work there).
function ManualCarouselsLoading() {
  const t = useTranslations("Generator");
  return <SmartSkeleton label={t("manualLoading")} variant="brand" />;
}

const ManualCarousels = dynamic(
  () => import("../../components/manual/manual-carousels/ManualCarousels").then((mod) => mod.ManualCarousels),
  {
    ssr: false,
    loading: () => <ManualCarouselsLoading />,
  },
);

// Celebration screen (framer-motion + lottie) only shows after wearing a look.
function CelebrationLoading() {
  const t = useTranslations("Generator");
  return <SmartSkeleton label={t("celebrationLoading")} variant="brand" />;
}

const OutfitCelebrationScreen = dynamic(
  () => import("../../components/showcase/outfit-celebration-screen/OutfitCelebrationScreen").then((mod) => mod.OutfitCelebrationScreen),
  {
    ssr: false,
    loading: () => <CelebrationLoading />,
  },
);

const ignoreLookAction = () => undefined;

function LoadingLooks({
  showOuterwear,
  preview,
}: {
  showOuterwear: boolean;
  preview: AiLook | null;
}) {
  const t = useTranslations("Generator");
  const variants = (
    showOuterwear ? ["outerwear", "top", "bottom", "footwear"] : ["top", "bottom", "footwear"]
  ) as ("outerwear" | "top" | "bottom" | "footwear")[];
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("loadingLooks")}
      className={styles.loading}
    >
      {preview ? (
        <>
          <p>{t("streamingPreview")}</p>
          <ShowcaseCard
            look={preview}
            position={1}
            total={1}
            isWearing
            canDiscard={false}
            onWear={ignoreLookAction}
            onDiscard={ignoreLookAction}
          />
        </>
      ) : (
        variants.map((variant) => (
          <SmartSkeleton
            key={variant}
            variant={variant}
            label={t(`carousels.${variant}`)}
            className={styles["loading-card"]}
          />
        ))
      )}
    </div>
  );
}

// Main generator flow: zero -> auto-select -> loading -> showcase, with
// manual carousels as the full-canvas alternative and escape hatch.
export function Home() {
  const {
    data: garments = [],
    isPending: isClosetPending,
    isError: isClosetError,
    refetch: refetchCloset,
  } = useClosetQuery();
  const { data: profile } = useProfileQuery();
  const { data: weather } = useWeatherQuery();
  const { data: favorites = [] } = useFavoritesQuery();

  const view = useGeneratorStore((state) => state.view);
  const lookStyle = useGeneratorStore((state) => state.lookStyle);
  const outfitDay = useGeneratorStore((state) => state.outfitDay);
  const setOutfitDay = useGeneratorStore((state) => state.setOutfitDay);
  const aiLooks = useGeneratorStore((state) => state.aiLooks);
  const streamedLooks = useGeneratorStore((state) => state.streamedLooks);
  const activeLookIndex = useGeneratorStore((state) => state.activeLookIndex);
  const discardCount = useGeneratorStore((state) => state.discardCount);
  const celebrationGarments = useGeneratorStore(
    (state) => state.celebrationGarments,
  );
  const insufficientStyle = useGeneratorStore((state) => state.insufficientStyle);
  // Rejection budget spent: at the limit of 4 the showcase yields to the
  // limit empty state instead of offering another discard.
  const discardLimitReached = discardCount >= MAX_DISCARD_COUNT;

  const generateLooks = useGenerateLooks();
  const wearToday = useWearToday();
  const planTomorrow = usePlanTomorrow();
  const doLaundry = useDoLaundry();

  const cleanGarments = useMemo(
    () =>
      garments.filter(isWearableGarment),
    [garments],
  );
  const byCategory = useMemo(
    () => categorizeGarments(cleanGarments),
    [cleanGarments],
  );
  const selectedWeather = getWeatherForDay(weather, outfitDay);
  const showOuterwear = shouldShowOuterwear(
    selectedWeather === null || weather === null || weather === undefined
      ? weather
      : { ...weather, ...selectedWeather },
    byCategory.outerwear.length,
  );
  const readiness = getGeneratorReadiness(garments);

  const recommenderProfile: RecommenderProfile | null =
    profile === null || profile === undefined
      ? null
      : {
          colorimetry: profile.colorimetry,
          morphology: profile.morphology,
          preferredFit: profile.preferredFit,
          lifestyle: profile.lifestyle,
        };

  const [useFavorite, setUseFavorite] = useState(false);
  const availableFavorites = useMemo(
    () => favorites.filter(isWearableGarment),
    [favorites],
  );

  const handleConfirmStyle = () => {
    if (readiness.status !== "ready") {
      return;
    }
    // If user checked the favorite checkbox and has favorites, navigate to favorites selection step
    if (useFavorite && availableFavorites.length > 0) {
      useGeneratorStore.getState().startFavoritesSelection();
    } else {
      startGeneration([]);
    }
  };

  const startGeneration = (forcedFavoritesIds: string[]) => {
    useGeneratorStore.getState().setView("loading");
    generateLooks.mutate({
      garments,
      profile: recommenderProfile,
      style: useGeneratorStore.getState().lookStyle,
      forcedFavoritesIds,
      suggestedFavoriteIds:
        forcedFavoritesIds.length === 0
          ? availableFavorites.map((garment) => garment.garmentId)
          : [],
    });
  };

  const handleFavoritesSelect = (garmentId: string) => {
    startGeneration([garmentId]);
  };

  const activeLook = aiLooks[activeLookIndex] ?? null;
  const t = useTranslations("Generator");
  const ta = useTranslations("Accessibility");
  const tc = useTranslations("Common");
  const router = useRouter();
  // The look is already worn + saved in history: closing the celebration
  // lands on the calendar so the user sees today filled in.
  const handleCelebrationClose = () => {
    useGeneratorStore.getState().resetFlow();
    router.push("/calendar");
  };
  const handleWearActiveLook = () => {
    if (!activeLook || wearToday.isPending || planTomorrow.isPending) {
      return;
    }
    if (outfitDay === "today") {
      wearToday.mutate(activeLook.garments);
    } else {
      planTomorrow.mutate(activeLook.garments);
    }
  };
  const handleDiscardActiveLook = () => {
    if (!discardLimitReached) {
      useGeneratorStore.getState().discardActiveLook();
    }
  };

  return (
    <section aria-label={t("sectionLabel")} className={styles.viewport} data-view={view}>
      {isClosetPending ? (
        <SmartSkeleton label={t("checkingCloset")} variant="brand" />
      ) : isClosetError ? (
        <EmptyState message={t("closetLoadError")}>
          <Button type="button" onClick={() => void refetchCloset()}>
            {tc("retry")}
          </Button>
        </EmptyState>
      ) : readiness.status !== "ready" ? (
        <EmptyState
          message={
            readiness.status === "empty"
              ? t("closetRequiredTitle")
              : readiness.status === "laundry"
                ? t("laundryRequiredTitle")
                : t("garmentsRequiredTitle")
          }
          description={
            readiness.status === "empty"
              ? t("closetRequiredDescription")
              : readiness.status === "laundry"
                ? t("laundryRequiredDescription")
                : t("garmentsRequiredDescription", {
                    categories: readiness.categories
                      .map((category) => t(`carousels.${category}`))
                      .join(", "),
                  })
          }
          testId="generator-blocked"
        >
          {readiness.status === "laundry" ? (
            <Button
              type="button"
              disabled={doLaundry.isPending}
              aria-busy={doLaundry.isPending}
              onClick={() => doLaundry.mutate()}
            >
              {doLaundry.isPending ? t("washing") : t("washToGenerate")}
            </Button>
          ) : (
            <Button type="button" onClick={() => router.push("/closet")}>
              {t("goToCloset")}
            </Button>
          )}
        </EmptyState>
      ) : (
      <>
      {view === "zero" ? (
        <ZeroState
          weather={weather}
          colorimetry={profile?.colorimetry ?? null}
          outfitDay={outfitDay}
          onOutfitDayChange={setOutfitDay}
          onAuto={() => useGeneratorStore.getState().startAutoSelect()}
          onManual={() => useGeneratorStore.getState().startManual()}
        />
      ) : null}

      {view === "auto-select" ? (
        <StyleStep
          value={lookStyle}
          isPending={generateLooks.isPending}
          onChange={(style) => useGeneratorStore.getState().setLookStyle(style)}
          onConfirm={handleConfirmStyle}
          onBack={() => useGeneratorStore.getState().setView("zero")}
          hasFavorites={availableFavorites.length > 0}
          useFavorite={useFavorite}
          onToggleFavorite={setUseFavorite}
        />
      ) : null}

      {view === "favorites-selection" ? (
        <FavoritesSelectionStep
          onSelect={handleFavoritesSelect}
          onBack={() => {
            useGeneratorStore.getState().setView("auto-select");
          }}
        />
      ) : null}

      {view === "loading" || generateLooks.isPending ? (
        <LoadingLooks
          showOuterwear={showOuterwear}
          preview={streamedLooks[0] ?? null}
        />
      ) : null}

      {view === "showcase" && !generateLooks.isPending ? (
        insufficientStyle !== null ? (
          <InsufficientStyleEmpty
            onChooseAnother={() =>
              useGeneratorStore.getState().startAutoSelect()
            }
            onManual={() => useGeneratorStore.getState().startManual()}
          />
        ) : discardLimitReached ? (
          <ShowcaseEmptyState
            reason="limit"
            onManual={() => useGeneratorStore.getState().startManual()}
          />
        ) : activeLook ? (
          <>
              <LookShowcase
              look={activeLook}
              position={activeLookIndex + 1}
              total={aiLooks.length}
              isWearing={wearToday.isPending || planTomorrow.isPending}
              canWear={outfitDay === "today"}
                canDiscard={!discardLimitReached}
                onWear={handleWearActiveLook}
                onDiscard={handleDiscardActiveLook}
              />
            <BottomActionBar
              label={ta("lookActions")}
              primaryLabel={
                outfitDay === "today" ? t("wear") : t("saveTomorrow")
              }
              onPrimary={handleWearActiveLook}
              primaryDisabled={
                wearToday.isPending || planTomorrow.isPending
              }
              isPrimaryPending={
                wearToday.isPending || planTomorrow.isPending
              }
              left={{
                label: ta("back"),
                onClick: () => useGeneratorStore.getState().setView("zero"),
                icon: <ChevronLeft aria-hidden="true" size={22} />,
              }}
              right={{
                label: ta("discardLook", {
                  position: activeLookIndex + 1,
                  total: aiLooks.length,
                }),
                onClick: handleDiscardActiveLook,
                disabled: discardLimitReached,
                icon: <X aria-hidden="true" size={22} />,
              }}
            />
          </>
        ) : (
          <ShowcaseEmptyState
            onManual={() => useGeneratorStore.getState().startManual()}
          />
        )
      ) : null}

      {view === "manual" ? (
        <ManualCarousels />
      ) : null}
      </>
      )}

      <AnimatePresence>
        {celebrationGarments !== null ? (
          <OutfitCelebrationScreen
            key="outfit-celebration"
            garments={celebrationGarments}
            onClose={handleCelebrationClose}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
