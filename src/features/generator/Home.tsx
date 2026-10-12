"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import { SmartSkeleton } from "@/components/Skeletons/SmartSkeleton";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { BottomActionBar } from "@/components/BottomActionBar/BottomActionBar";
import { Button } from "@/components/Button/Button";
import { useRouter } from "@/i18n/navigation";
import { useClosetQuery } from "@/features/closet/useClosetQuery";
import { useDoLaundry } from "@/features/profile/useDoLaundry";
import { useProfileQuery } from "@/features/profile/useProfileQuery";
import { useGeneratorStore } from "./useGeneratorStore";
import { MAX_DISCARD_COUNT } from "@/constants/generator";
import { shouldShowOuterwear, useWeatherQuery } from "./useWeatherQuery";
import { useGenerateLooks } from "./useGenerateLooks";
import { useWearToday } from "./useWearToday";
import type { RecommenderProfile } from "./useGenerateLook";
import { categorizeGarments, isLaundryExemptGarment } from "./categorizeGarments";
import { ZeroState } from "./ZeroState";
import { StyleStep } from "./StyleStep";
import { LookShowcase, ShowcaseEmptyState } from "./LookShowcase";
import { InsufficientStyleEmpty } from "./InsufficientStyleEmpty";
import { getGeneratorReadiness } from "./generatorReadiness";
import styles from "./Home.module.scss";

// Swiper carousels are heavy: split them so the zero state stays instant.
// The loading fallback is translated inside its own component (hooks work there).
function ManualCarouselsLoading() {
  const t = useTranslations("Generator");
  return <SmartSkeleton label={t("manualLoading")} variant="brand" />;
}

const ManualCarousels = dynamic(
  () => import("./ManualCarousels").then((mod) => mod.ManualCarousels),
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
  () => import("./OutfitCelebrationScreen").then((mod) => mod.OutfitCelebrationScreen),
  {
    ssr: false,
    loading: () => <CelebrationLoading />,
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
  const {
    data: garments = [],
    isPending: isClosetPending,
    isError: isClosetError,
    refetch: refetchCloset,
  } = useClosetQuery();
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
  const doLaundry = useDoLaundry();

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

  const handleConfirmStyle = () => {
    if (readiness.status !== "ready") {
      return;
    }
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
  const tc = useTranslations("Common");
  const router = useRouter();
  // The look is already worn + saved in history: closing the celebration
  // lands on the calendar so the user sees today filled in.
  const handleCelebrationClose = () => {
    useGeneratorStore.getState().resetFlow();
    router.push("/calendar");
  };
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
