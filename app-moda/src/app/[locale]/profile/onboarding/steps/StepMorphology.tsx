"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { OnboardingArt } from "@/features/onboarding/OnboardingArt";
import {
  FIT_CHOICES,
  MEASURE_MAX_CM,
  MEASURE_MIN_CM,
  useOnboardingStore,
} from "@/features/onboarding/onboardingStore";
import styles from "../page.module.scss";

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
    <div className={styles.measureCol}>
      <Image
        src={guideSrc}
        alt={label}
        width={72}
        height={96}
        className={styles.measureGuide}
      />
      <output htmlFor={field} className={styles.measureValue}>
        {value}
        <span className={styles.measureUnit}>cm</span>
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
        className={styles.verticalRange}
      />
      <span className={styles.measureName}>{label}</span>
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

      <div className={styles.measureRow}>
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

      <fieldset className={styles.fieldset}>
        <legend>{t("fitLabel")}</legend>
        <div className={styles.segmented} role="radiogroup" aria-label={t("fitLabel")}>
          {FIT_CHOICES.map((option) => (
            <label
              key={option}
              className={cn(
                styles.segmentOption,
                fit === option && styles.selected,
              )}
            >
              <input
                type="radio"
                name="fit"
                value={option}
                checked={fit === option}
                onChange={() => setFit(option)}
                className={styles.radio}
              />
              <span>{t(`fits.${option}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
