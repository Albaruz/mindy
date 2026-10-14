"use client";

import { useTranslations } from "next-intl";
import { ColorSwatches } from "@/components/ColorSwatches/ColorSwatches";
import { OnboardingArt } from "@/features/onboarding/OnboardingArt";
import {
  EYE_COLOR_SWATCHES,
  EYE_COLORS,
  SKIN_TONE_SWATCHES,
  SKIN_TONES,
} from "@/constants/profile";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";
import styles from "../OnboardingWizard.module.scss";

// Flat metallic gradients: no heavy shadows, no 3D, just a subtle sheen.
const JEWELRY_SWATCHES: Record<string, string> = {
  gold: "linear-gradient(135deg, #f0d48a 0%, #d4a017 55%, #9c6f0e 100%)",
  silver: "linear-gradient(135deg, #f2f3f5 0%, #c3c9d1 55%, #8e9aaf 100%)",
};

const JEWELRY_OPTIONS = ["gold", "silver"] as const;

// Step 4: indirect colorimetry via flat makeup-style swatches (skin, eyes)
// plus metallic jewelry circles. No figurative iconography here.
export function StepColorimetry() {
  const t = useTranslations("Onboarding");
  const ta = useTranslations("Accessibility");
  const skinTone = useOnboardingStore((state) => state.skinTone);
  const eyeColor = useOnboardingStore((state) => state.eyeColor);
  const jewelry = useOnboardingStore((state) => state.jewelry);
  const setSkinTone = useOnboardingStore((state) => state.setSkinTone);
  const setEyeColor = useOnboardingStore((state) => state.setEyeColor);
  const setJewelry = useOnboardingStore((state) => state.setJewelry);

  return (
    <>
      <OnboardingArt step={4} label={ta("threadArt")} className={styles.art} />
      <h1 className={styles.question}>{t("colorsKeyword")}</h1>
      <p className={styles.lead}>{t("xrayTitle")}</p>

      <ColorSwatches
        name="skinTone"
        label={t("skinTone")}
        options={SKIN_TONES}
        swatches={SKIN_TONE_SWATCHES}
        value={skinTone}
        onSelect={setSkinTone}
        formatOption={(option) => t(`skinTones.${option}`)}
      />
      <ColorSwatches
        name="eyeColor"
        label={t("eyeColor")}
        options={EYE_COLORS}
        swatches={EYE_COLOR_SWATCHES}
        value={eyeColor}
        onSelect={setEyeColor}
        formatOption={(option) => t(`eyeColors.${option}`)}
      />
      <ColorSwatches
        name="jewelry"
        label={t("jewelryQuestion")}
        options={JEWELRY_OPTIONS}
        swatches={JEWELRY_SWATCHES}
        value={jewelry}
        onSelect={setJewelry}
        allowDeselect
        formatOption={(option) => t(`jewelry.${option}`)}
      />
    </>
  );
}
