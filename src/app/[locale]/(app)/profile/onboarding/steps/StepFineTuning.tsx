"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { OnboardingArt } from "@/features/onboarding/OnboardingArt";
import {
  FORBIDDEN_COLOR_OPTIONS,
  THERMAL_MAX,
  THERMAL_MIN,
} from "@/constants/ui-config";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";
import styles from "../page.module.scss";

// Step 5: thermal slider (1 = chilly, 5 = always warm) + veto color circles.
export function StepFineTuning() {
  const t = useTranslations("Onboarding");
  const ta = useTranslations("Accessibility");
  const thermal = useOnboardingStore((state) => state.thermal);
  const forbiddenColors = useOnboardingStore((state) => state.forbiddenColors);
  const setThermal = useOnboardingStore((state) => state.setThermal);
  const toggleForbiddenColor = useOnboardingStore(
    (state) => state.toggleForbiddenColor,
  );

  return (
    <>
      <OnboardingArt step={5} label={ta("threadArt")} className={styles.art} />
      <h1 className={styles.question}>{t("quirksKeyword")}</h1>
      <p className={styles.lead}>{t("quirksTitle")}</p>

      <div className={styles.fieldset}>
        <label htmlFor="thermal" className={styles["thermal-label"]}>
          {t("thermal-label")}
        </label>
        <div className={styles["thermal-scale"]} aria-hidden="true">
          <span>{t("thermalCold")}</span>
          <span>{t("thermalHot")}</span>
        </div>
        <input
          id="thermal"
          name="thermal"
          type="range"
          min={THERMAL_MIN}
          max={THERMAL_MAX}
          step={1}
          value={thermal}
          onChange={(event) => setThermal(Number(event.target.value))}
          aria-label={t("thermal-label")}
          aria-valuetext={t("thermal-value", { value: thermal })}
          className={styles["thick-range"]}
        />
        <p className={styles["thermal-value"]} aria-hidden="true">
          {t("thermal-value", { value: thermal })}
        </p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>{t("forbiddenLabel")}</legend>
        <div className={styles["veto-row"]}>
          {FORBIDDEN_COLOR_OPTIONS.map((hex) => {
            const vetoed = forbiddenColors.includes(hex);
            return (
              <label
                key={hex}
                title={hex}
                className={cn(styles.veto, vetoed && styles["veto--vetoed"])}
              >
                <input
                  type="checkbox"
                  name="forbiddenColors"
                  value={hex}
                  checked={vetoed}
                  onChange={() => toggleForbiddenColor(hex)}
                  className={styles.radio}
                  aria-label={ta("vetoColor", { color: hex })}
                />
                <span
                  aria-hidden="true"
                  className={styles["veto-dot"]}
                  style={{ backgroundColor: hex }}
                />
              </label>
            );
          })}
        </div>
        <p className={styles.subcopy}>
          {forbiddenColors.length === 0
            ? t("forbiddenNone")
            : t("forbiddenCount", { count: forbiddenColors.length })}
        </p>
      </fieldset>
    </>
  );
}
