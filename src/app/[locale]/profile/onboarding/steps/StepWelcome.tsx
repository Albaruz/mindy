"use client";

import { useTranslations } from "next-intl";
import { OnboardingArt } from "@/features/onboarding/OnboardingArt";
import { DISPLAY_NAME_MAX_LENGTH } from "@/constants/validation";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";
import styles from "../page.module.scss";

// Step 1: presentation. The only free-text input in the whole wizard.
export function StepWelcome() {
  const t = useTranslations("Onboarding");
  const ta = useTranslations("Accessibility");
  const displayName = useOnboardingStore((state) => state.displayName);
  const setDisplayName = useOnboardingStore((state) => state.setDisplayName);

  return (
    <>
      <OnboardingArt step={1} label={ta("threadArt")} className={styles.art} />
      <h1 className={styles.question}>{t("nameKeyword")}</h1>
      <p className={styles.lead}>{t("welcomeTitle")}</p>
      <label htmlFor="displayName" className={styles.giantLabel}>
        {t("nameLabel")}
      </label>
      <input
        id="displayName"
        name="displayName"
        type="text"
        autoComplete="given-name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        placeholder={t("namePlaceholder")}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        className={styles.giantInput}
      />
    </>
  );
}
