"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import { SmartSkeleton } from "@/components/Skeletons/SmartSkeleton";
import { BottomActionBar } from "@/components/BottomActionBar/BottomActionBar";
import { useClosetQuery } from "@/features/closet/useClosetQuery";
import { useProfileQuery } from "@/features/profile/useProfileQuery";
import { MAX_DISCARD_COUNT, useGeneratorStore } from "./useGeneratorStore";
import { shouldShowOuterwear, useWeatherQuery } from "./useWeatherQuery";
import { useGenerateLooks } from "./useGenerateLooks";
import { useWearToday } from "./useWearToday";
import type { RecommenderProfile } from "./useGenerateLook";
import { categorizeGarments, isLaundryExemptGarment } from "./categorizeGarments";
import { ZeroState } from "./ZeroState";
import { StyleStep } from "./StyleStep";
import { LookShowcase, ShowcaseEmptyState } from "./LookShowcase";
import { InsufficientStyleEmpty } from "./InsufficientStyleEmpty";
import { OutfitCelebrationScreen } from "./OutfitCelebrationScreen";
import styles from "./Home.module.scss";

// Swiper carousels are heavy: split them so the zero state stays instant.
const ManualCarousels = dynamic(
  () => import("./ManualCarousels").then((mod) => mod.ManualCarousels),
  {
    ssr: false,
    loading: () => <SmartSkeleton label="manual carousels" variant="brand" />,
  },
);

function LoadingLooks({ showOuterwear }: { showOuterwear: boolean }) {
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
      {variants.map((variant) => (
        <SmartSkeleton
          key={variant}
          variant={variant}
          label={t(`carousels.${variant}`)}
          className={styles.loadingCard}
        />
      ))}
    </div>
  );
}

// Main generator flow: zero -> auto-select -> loading -> showcase, with
// manual carousels as the full-canvas alternative and escape hatch.
export function Home() {
  const { data: garments = [] } = useClosetQuery();
  const { data: profile } = useProfileQuery();
  const { data: weather } = useWeatherQuery();

  const view = useGeneratorStore((state) => state.view);
  const lookStyle = useGeneratorStore((state) => state.lookStyle);
  const aiLooks = useGeneratorStore((state) => state.aiLooks);
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

  const cleanGarments = useMemo(
    () =>
      garments.filter(
        (garment) => !garment.isDirty || isLaundryExemptGarment(garment),
      ),
    [garments],
  );
  const byCategory = useMemo(
    () => categorizeGarments(cleanGarments),
    [cleanGarments],
  );
  const showOuterwear = shouldShowOuterwear(
    weather,
    byCategory.outerwear.length,
  );

  const recommenderProfile: RecommenderProfile | null =
    profile === null || profile === undefined
      ? null
      : {
          colorimetry: profile.colorimetry,
          morphology: profile.morphology,
          preferredFit: profile.preferredFit,
          lifestyle: profile.lifestyle,
        };

  const handleConfirmStyle = () => {
    useGeneratorStore.getState().startLoading();
    generateLooks.mutate({
      garments,
      profile: recommenderProfile,
      style: useGeneratorStore.getState().lookStyle,
    });
  };

  const activeLook = aiLooks[activeLookIndex] ?? null;
  const t = useTranslations("Generator");
  const ta = useTranslations("Accessibility");
  const handleWearActiveLook = () => {
    if (activeLook && !wearToday.isPending) {
      wearToday.mutate(activeLook.garments);
    }
  };
  const handleDiscardActiveLook = () => {
    if (!discardLimitReached) {
      useGeneratorStore.getState().discardActiveLook();
    }
  };

  return (
    <section aria-label={t("sectionLabel")} className={styles.viewport} data-view={view}>
      {view === "zero" ? (
        <ZeroState
          weather={weather}
          colorimetry={profile?.colorimetry ?? null}
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
        />
      ) : null}

      {view === "loading" || generateLooks.isPending ? (
        <LoadingLooks showOuterwear={showOuterwear} />
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
              isWearing={wearToday.isPending}
              canDiscard={!discardLimitReached}
              onWear={handleWearActiveLook}
              onDiscard={handleDiscardActiveLook}
              onEditManual={() =>
                useGeneratorStore.getState().editActiveLookInManual()
              }
            />
            <BottomActionBar
              label={ta("lookActions")}
              primaryLabel={t("wear")}
              onPrimary={handleWearActiveLook}
              primaryDisabled={wearToday.isPending}
              isPrimaryPending={wearToday.isPending}
              left={{
                label: ta("resetFlow"),
                onClick: () => useGeneratorStore.getState().resetFlow(),
                icon: <RotateCcw aria-hidden="true" size={22} />,
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

      <AnimatePresence>
        {celebrationGarments !== null ? (
          <OutfitCelebrationScreen
            key="outfit-celebration"
            garments={celebrationGarments}
            onClose={() => useGeneratorStore.getState().resetFlow()}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
