"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { RadioSegments } from "@/components/RadioSegments/RadioSegments";
import { OnboardingArt } from "@/features/onboarding/OnboardingArt";
import {
  SHOP_SECTIONS,
  STYLE_TRIBES,
} from "@/constants/ui-config";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";
import styles from "../OnboardingWizard.module.scss";

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

      <RadioSegments
        name="section"
        label={t("sectionLabel")}
        options={SHOP_SECTIONS}
        value={section}
        onSelect={setSection}
        formatOption={(option) => t(`sections.${option}`)}
      />

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
                  selected && styles["editorial-card--selected"],
                )}
              >
                <input
                  type="radio"
                  name="style"
                  value={option}
                  checked={selected}
                  onChange={() => setStyle(option)}
                  className={cn("visually-hidden", styles.radio)}
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
