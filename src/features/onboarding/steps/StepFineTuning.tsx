"use client";

import { useTranslations } from "next-intl";
import { ColorSwatches } from "@/components/ColorSwatches/ColorSwatches";
import { OnboardingArt } from "@/features/onboarding/OnboardingArt";
import {
  FORBIDDEN_COLOR_OPTIONS,
  THERMAL_MAX,
  THERMAL_MIN,
} from "@/constants/ui-config";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";
import styles from "../OnboardingWizard.module.scss";

// Each forbidden color is its own swatch (hex in, hex out).
const FORBIDDEN_COLOR_SWATCHES: Record<string, string> = Object.fromEntries(
  FORBIDDEN_COLOR_OPTIONS.map((hex) => [hex, hex]),
);

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
        <label htmlFor="thermal" className={styles["thermalLabel"]}>
          {t("thermalLabel")}
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
          aria-label={t("thermalLabel")}
          aria-valuetext={t("thermalValue", { value: thermal })}
          className={styles["thick-range"]}
        />
        <p className={styles["thermalValue"]} aria-hidden="true">
          {t("thermalValue", { value: thermal })}
        </p>
      </div>

      <ColorSwatches
        multiple
        name="forbiddenColors"
        label={t("forbiddenLabel")}
        options={FORBIDDEN_COLOR_OPTIONS}
        swatches={FORBIDDEN_COLOR_SWATCHES}
        values={forbiddenColors}
        onToggle={toggleForbiddenColor}
        formatOption={(hex) => ta("vetoColor", { color: hex })}
        tone="danger"
        hideNames
      />
      <p className={styles.subcopy}>
        {forbiddenColors.length === 0
          ? t("forbiddenNone")
          : t("forbiddenCount", { count: forbiddenColors.length })}
      </p>
    </>
  );
}
