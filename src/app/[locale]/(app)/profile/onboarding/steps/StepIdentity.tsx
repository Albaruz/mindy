"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { OnboardingArt } from "@/features/onboarding/OnboardingArt";
import {
  SHOP_SECTIONS,
  STYLE_TRIBES,
} from "@/constants/ui-config";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";
import styles from "../page.module.scss";

// Step 2: shopping section (giant segmented) + style tribe as vertical
// editorial cards (Playfair, thin Brown Ash border, scale on select).
export function StepIdentity() {
  const t = useTranslations("Onboarding");
  const ta = useTranslations("Accessibility");
  const displayName = useOnboardingStore((state) => state.displayName);
  const section = useOnboardingStore((state) => state.section);
  const style = useOnboardingStore((state) => state.style);
  const setSection = useOnboardingStore((state) => state.setSection);
  const setStyle = useOnboardingStore((state) => state.setStyle);
  const firstName = displayName.trim().split(/\s+/)[0] ?? "";

  return (
    <>
      <OnboardingArt step={2} label={ta("threadArt")} className={styles.art} />
      <h1 className={styles.question}>{t("styleKeyword")}</h1>
      <p className={styles.lead}>
        {firstName !== ""
          ? t("identityTitleNamed", { name: firstName })
          : t("identityTitle")}
      </p>

      <fieldset className={styles.fieldset}>
        <legend>{t("sectionLabel")}</legend>
        <div className={styles.segmented} role="radiogroup" aria-label={t("sectionLabel")}>
          {SHOP_SECTIONS.map((option) => (
            <label
              key={option}
              className={cn(
                styles["segment-option"],
                section === option && styles.selected,
              )}
            >
              <input
                type="radio"
                name="section"
                value={option}
                checked={section === option}
                onChange={() => setSection(option)}
                className={styles.radio}
              />
              <span>{t(`sections.${option}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>{t("styleLabel")}</legend>
        <div className={styles["editorial-stack"]}>
          {STYLE_TRIBES.map((option) => {
            const selected = style === option;
            return (
              <motion.label
                key={option}
                initial={false}
                animate={{ scale: selected ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className={cn(
                  styles["editorial-card"],
                  selected && styles.selected,
                )}
              >
                <input
                  type="radio"
                  name="style"
                  value={option}
                  checked={selected}
                  onChange={() => setStyle(option)}
                  className={styles.radio}
                />
                <span className={styles["editorial-name"]}>
                  {t(`styles.${option}`)}
                </span>
                <span className={styles["editorial-hint"]}>
                  {t(`styleHints.${option}`)}
                </span>
              </motion.label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
