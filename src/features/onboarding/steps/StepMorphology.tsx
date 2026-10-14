"use client";

import Image from "next/image";
import { RadioSegments } from "@/components/RadioSegments/RadioSegments";
import { useTranslations } from "next-intl";
import { OnboardingArt } from "@/features/onboarding/OnboardingArt";
import {
  FIT_CHOICES,
  MEASURE_MAX_CM,
  MEASURE_MIN_CM,
} from "@/constants/ui-config";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";
import styles from "../OnboardingWizard.module.scss";

interface MeasureSliderProps {
  field: "chestCm" | "waistCm" | "hipCm";
  label: string;
  guideSrc: string;
}

// Thick tactile vertical slider paired with its real measuring-guide
// image (hybrid composition: photo guide + slider control).
function MeasureSlider({ field, label, guideSrc }: MeasureSliderProps) {
  const ta = useTranslations("Accessibility");
  const value = useOnboardingStore((state) => state[field]);
  const setMeasurement = useOnboardingStore((state) => state.setMeasurement);

  return (
    <div className={styles["measure-col"]}>
      <Image
        src={guideSrc}
        alt={label}
        width={72}
        height={96}
        className={styles["measure-guide"]}
      />
      <output htmlFor={field} className={styles["measureValue"]}>
        {value}
        <span className={styles["measure-unit"]}>cm</span>
      </output>
      <input
        id={field}
        name={field}
        type="range"
        min={MEASURE_MIN_CM}
        max={MEASURE_MAX_CM}
        step={1}
        value={value}
        onChange={(event) =>
          setMeasurement(field, Number(event.target.value))
        }
        aria-label={ta("measureCentimeters", { label })}
        aria-valuetext={ta("measureValue", { value })}
        className={styles["vertical-range"]}
      />
      <span className={styles["measure-name"]}>{label}</span>
    </div>
  );
}

// Step 3: real measurements on chunky vertical sliders + fit picker.
export function StepMorphology() {
  const t = useTranslations("Onboarding");
  const ta = useTranslations("Accessibility");
  const fit = useOnboardingStore((state) => state.fit);
  const setFit = useOnboardingStore((state) => state.setFit);

  return (
    <>
      <OnboardingArt step={3} label={ta("threadArt")} className={styles.art} />
      <h1 className={styles.question}>{t("measuresKeyword")}</h1>
      <p className={styles.lead}>{t("measuresTitle")}</p>
      <p className={styles.subcopy}>{t("measuresSubtitle")}</p>

      <div className={styles["measure-row"]}>
        <MeasureSlider
          field="chestCm"
          label={t("chest")}
          guideSrc="/assets/chest-guide.svg"
        />
        <MeasureSlider
          field="waistCm"
          label={t("waist")}
          guideSrc="/assets/waist-guide.svg"
        />
        <MeasureSlider
          field="hipCm"
          label={t("hip")}
          guideSrc="/assets/hip-guide.svg"
        />
      </div>

      <RadioSegments
        name="fit"
        label={t("fitLabel")}
        options={FIT_CHOICES}
        value={fit}
        onSelect={setFit}
        formatOption={(option) => t(`fits.${option}`)}
      />
    </>
  );
}
