"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { SmartSkeleton } from "@/components/Skeletons/SmartSkeleton";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { useProfileQuery } from "@/features/profile/useProfileQuery";
import { MorphoIcon } from "@/features/profile/MorphoIcon";
import { SEASON_PALETTES } from "@/features/profile/seasonPalettes";
import { SettingsControls } from "@/features/settings/SettingsControls";
import type { Colorimetry } from "@/types/user";
import { useQueryClient } from "@tanstack/react-query";
import { del } from "idb-keyval";
import { Link } from "@/i18n/navigation";
import { PERSISTED_CACHE_KEY } from "@/app/providers";
import { signOutAction } from "./actions";
import styles from "./page.module.scss";

// Overlapping flat swatches for the colorimetry card.
function PaletteFan({ season }: { season: Colorimetry }) {
  const swatches = SEASON_PALETTES[season];
  return (
    <div aria-hidden="true" className={styles.fan}>
      {swatches.map((hex) => (
        <span
          key={hex}
          className={styles.fanDot}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}

function formatValue(value: string | null, notSet: string): string {
  if (value === null) {
    return notSet;
  }
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const tc = useTranslations("Common");
  const ts = useTranslations("Settings");
  const {
    data: profile,
    isPending: isProfilePending,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useProfileQuery();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    // Drop cached server state before killing the session so the next
    // account never flashes this one's closet: memory cache plus the
    // persisted IndexedDB copy (wardrobe/history/profile stay on disk
    // otherwise). The action redirects to /.
    queryClient.clear();
    void del(PERSISTED_CACHE_KEY)
      .catch(() => {
        // Private mode may reject: memory is already cleared above.
      })
      .finally(() => {
        void signOutAction();
      });
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
      <div className={styles.headerRow}>
        <h1 className={styles.headline}>
          {displayName !== null
            ? t("headlineNamed", { name: displayName })
            : t("headline")}
        </h1>
        <Link
          href="/profile/onboarding?edit=true"
          aria-label={t("edit")}
          className={styles.editLink}
        >
          <Pencil aria-hidden="true" size={18} />
        </Link>
      </div>

      {isProfilePending ? (
        <div className={styles.bento}>
          <SmartSkeleton label={t("headline")} />
          <SmartSkeleton label={t("headline")} />
          <SmartSkeleton label={t("headline")} />
        </div>
      ) : isProfileError ? (
        <EmptyState message={t("loadError")}>
          <Button onClick={() => void refetchProfile()}>
            {tc("retry")}
          </Button>
        </EmptyState>
      ) : profile === null || profile === undefined ? (
        <EmptyState message={t("unlockMessage")}>
          <Link href="/profile/onboarding" className={styles.onboardingLink}>
            {t("onboardingLink")}
          </Link>
        </EmptyState>
      ) : (
        <div className={styles.bento}>
          <article className={styles.colorCard}>
            <p className={styles.cardKicker}>{t("labels.colorimetry")}</p>
            <p className={styles.cardHero}>
              {formatValue(profile.colorimetry, t("notSet"))}
            </p>
            {profile.colorimetry !== null ? (
              <PaletteFan season={profile.colorimetry} />
            ) : null}
          </article>

          <article className={styles.morphoCard}>
            {profile.morphology !== null ? (
              <MorphoIcon
                type={profile.morphology}
                className={styles.morphoArt}
              />
            ) : null}
            <div className={styles.morphoText}>
              <p className={styles.cardKicker}>{t("labels.morphology")}</p>
              <p className={styles.cardHero}>
                {formatValue(profile.morphology, t("notSet"))}
              </p>
            </div>
          </article>

          <article className={styles.fitCard}>
            <p className={styles.cardCaption}>{t("fitCaption")}</p>
            <p className={styles.cardValue}>
              {formatValue(profile.preferredFit, t("notSet"))}
            </p>
          </article>

          <article className={styles.lifeCard}>
            <p className={styles.cardCaption}>{t("lifestyleCaption")}</p>
            <p className={styles.cardValue}>
              {formatValue(profile.lifestyle, t("notSet"))}
            </p>
          </article>
        </div>
      )}

      <section aria-label={ts("title")} className={styles.preferences}>
        <h2 className={styles.preferencesTitle}>{ts("title")}</h2>
        <SettingsControls />
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={styles.signOut}
      >
        {isSigningOut ? t("signingOut") : t("signOut")}
      </button>
    </section>
  );
}
