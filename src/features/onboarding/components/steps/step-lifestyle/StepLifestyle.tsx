"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LIFESTYLES } from "@/constants/profile";
import { useOnboardingStore } from "@/features/onboarding/state/onboarding-store/onboardingStore";
import { OnboardingArt } from "@/features/onboarding/components/onboarding-art/OnboardingArt";
import { cn } from "@/lib/utils";
import styles from "../../../views/onboarding-wizard/OnboardingWizard.module.scss";

// Ask about daily routine independently from clothing style.
export function StepLifestyle() {
  const t = useTranslations("Onboarding");
  const ta = useTranslations("Accessibility");
  const lifestyle = useOnboardingStore((state) => state.lifestyle);
  const setLifestyle = useOnboardingStore((state) => state.setLifestyle);

  return (
    <>
      <OnboardingArt step={2} label={ta("threadArt")} className={styles.art} />
      <h1 className={styles.question}>{t("lifestyleKeyword")}</h1>
      <fieldset className={styles.fieldset}>
        <legend>{t("lifestyleLabel")}</legend>
        <div className={styles["editorial-stack"]}>
          {LIFESTYLES.map((option) => {
            const selected = lifestyle === option;
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
                  name="lifestyle"
                  value={option}
                  checked={selected}
                  onChange={() => setLifestyle(option)}
                  className={cn("visually-hidden", styles.radio)}
                />
                <span className={styles["editorial-name"]}>
                  {t(`lifestyles.${option}`)}
                </span>
                <span className={styles["editorial-hint"]}>
                  {t(`lifestyleHints.${option}`)}
                </span>
              </motion.label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
