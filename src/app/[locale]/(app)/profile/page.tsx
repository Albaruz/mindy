"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Loading } from "@/components/Loading/Loading";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useProfileQuery } from "@/features/profile/hooks/profile/useProfileQuery";
import { useProfileValueLabel } from "@/features/profile/domain/profile/profileValueLabels";
import { MorphoIcon } from "@/features/profile/components/morpho-icon/MorphoIcon";
import { SEASON_PALETTES } from "@/constants/profile";
import { SettingsControls } from "@/features/settings/components/settings-controls/SettingsControls";
import type { Colorimetry } from "@/types/user";
import { useQueryClient } from "@tanstack/react-query";
import { del } from "idb-keyval";
import { Link } from "@/i18n/navigation";
import { PERSISTED_CACHE_KEY } from "@/constants/storage";
import { signOutAction } from "./actions";
import { useUploadQueueStore } from "@/stores/useUploadQueueStore";
import { useOnboardingStore } from "@/features/onboarding/state/onboarding-store/onboardingStore";
import styles from "./page.module.scss";

// Overlapping flat swatches for the colorimetry card.
function PaletteFan({ season }: { season: Colorimetry }) {
  const swatches = SEASON_PALETTES[season];
  return (
    <div aria-hidden="true" className={styles.fan}>
      {swatches.map((hex) => (
        <span
          key={hex}
          className={styles["fan-dot"]}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const tc = useTranslations("Common");
  const ts = useTranslations("Settings");
  const valueLabel = useProfileValueLabel();
  const {
    data: profile,
    isPending: isProfilePending,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useProfileQuery();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    // Drop queued files and cached server state before killing the session so the next
    // account never flashes this one's closet: memory cache plus the
    // persisted IndexedDB copy (wardrobe/history/profile stay on disk
    // otherwise). The action redirects to /.
    await useUploadQueueStore.getState().clearAll().catch(() => undefined);
    queryClient.clear();
    await del(PERSISTED_CACHE_KEY).catch(() => {
      // Private mode may reject: the in-memory cache is already cleared.
    });
    useOnboardingStore.getState().reset();
    await signOutAction();
  };

  const displayName =
    profile !== null &&
    profile !== undefined &&
    typeof profile.extraPreferences.displayName === "string" &&
    profile.extraPreferences.displayName.trim() !== ""
      ? profile.extraPreferences.displayName.trim()
      : null;

  return (
    <section className={styles.page}>
      <div className={styles["header-row"]}>
        <h1 className={styles.headline}>
          {displayName !== null
            ? t("headlineNamed", { name: displayName })
            : t("headline")}
        </h1>
        <Link
          href="/profile/onboarding?edit=true"
          aria-label={t("edit")}
          className={styles["edit-link"]}
        >
          <Pencil aria-hidden="true" size={18} />
        </Link>
      </div>

      {isProfilePending ? (
        <Loading />
      ) : isProfileError ? (
        <EmptyState message={t("loadError")}>
          <Button onClick={() => void refetchProfile()}>
            {tc("retry")}
          </Button>
        </EmptyState>
      ) : profile === null || profile === undefined ? (
        <EmptyState message={t("unlockMessage")}>
          <Link href="/profile/onboarding" className={styles["onboarding-link"]}>
            {t("onboardingLink")}
          </Link>
        </EmptyState>
      ) : (
        <div className={styles.bento}>
          <article className={styles["color-card"]}>
            <p className={styles["card-kicker"]}>{t("labels.colorimetry")}</p>
            <p className={styles["card-hero"]}>
              {valueLabel("colorimetry", profile.colorimetry) ?? t("notSet")}
            </p>
            {profile.colorimetry !== null ? (
              <PaletteFan season={profile.colorimetry} />
            ) : null}
          </article>

          <article className={styles["morpho-card"]}>
            {profile.morphology !== null ? (
              <MorphoIcon
                type={profile.morphology}
                className={styles["morpho-art"]}
              />
            ) : null}
            <div className={styles["morpho-text"]}>
              <p className={styles["card-kicker"]}>{t("labels.morphology")}</p>
              <p className={styles["card-hero"]}>
                {valueLabel("morphology", profile.morphology) ?? t("notSet")}
              </p>
            </div>
          </article>

          <article className={styles["fit-card"]}>
            <p className={styles["card-caption"]}>{t("fitCaption")}</p>
            <p className={styles["card-value"]}>
              {valueLabel("fit", profile.preferredFit) ?? t("notSet")}
            </p>
          </article>

          <article className={styles["life-card"]}>
            <p className={styles["card-caption"]}>{t("lifestyleCaption")}</p>
            <p className={styles["card-value"]}>
              {valueLabel("lifestyle", profile.lifestyle) ?? t("notSet")}
            </p>
          </article>
        </div>
      )}

      <section aria-label={ts("title")} className={styles.preferences}>
        <h2 className={styles["preferences-title"]}>{ts("title")}</h2>
        <SettingsControls />
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={styles["sign-out"]}
      >
        {isSigningOut ? t("signingOut") : t("signOut")}
      </button>
    </section>
  );
}
