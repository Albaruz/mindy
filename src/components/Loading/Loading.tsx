// Shared pending state: the intro thread spool floats above the fixed
// tidy-the-closet copy. The generator keeps SmartSkeleton (its pending
// states are per-garment silhouettes, not a whole screen).
"use client";

import { useTranslations } from "next-intl";
import styles from "./Loading.module.scss";

export function Loading() {
  const t = useTranslations("Common");
  return (
    <div role="status" aria-busy="true" className={styles.loading}>
      {/* The PNG asset is served directly because Next Image optimization
          does not handle this existing asset reliably in development. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/loading-transparent.png"
        alt=""
        className={styles.loading__art}
      />
      <p className={styles.loading__message}>{t("loadingMessage")}</p>
    </div>
  );
}
