"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import { saveProfileAction } from "@/actions/profileActions";
import {
  buildWizardPayload,
} from "@/features/onboarding/onboardingInference";
import { useOnboardingStore } from "@/features/onboarding/onboardingStore";
import { useRouter } from "@/i18n/navigation";
import { TOTAL_STEPS } from "@/constants/ui-config";
import { SAVE_ARM_DELAY_MS } from "@/constants/animations";
import { DISPLAY_NAME_MIN_LENGTH } from "@/constants/validation";
import type { UserProfile } from "@/types/user";
import { StepWelcome } from "./steps/StepWelcome";
import { StepIdentity } from "./steps/StepIdentity";
import { StepMorphology } from "./steps/StepMorphology";
import { StepColorimetry } from "./steps/StepColorimetry";
import { StepFineTuning } from "./steps/StepFineTuning";
import { OnboardingSuccess } from "./steps/OnboardingSuccess";
import styles from "./page.module.scss";

function isStepComplete(
  step: number,
  answers: {
    displayName: string;
    section: string;
    style: string;
    fit: string;
    skinTone: string;
    eyeColor: string;
    jewelry: string;
  },
): boolean {
  switch (step) {
    case 1:
      return answers.displayName.trim().length >= DISPLAY_NAME_MIN_LENGTH;
    case 2:
      return answers.section !== "" && answers.style !== "";
    case 3:
      return answers.fit !== "";
    case 4:
      // Jewelry is optional: skin and eyes alone unlock Continue.
      return answers.skinTone !== "" && answers.eyeColor !== "";
    case 5:
      return true;
    default:
      return false;
  }
}

export function OnboardingWizard({
  initialProfile = null,
}: {
  initialProfile?: UserProfile | null;
}) {
  const t = useTranslations("Onboarding");
  const ta = useTranslations("Accessibility");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveArmed, setSaveArmed] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const prefilled = useRef(false);

  const displayName = useOnboardingStore((state) => state.displayName);
  const section = useOnboardingStore((state) => state.section);
  const style = useOnboardingStore((state) => state.style);
  const chestCm = useOnboardingStore((state) => state.chestCm);
  const waistCm = useOnboardingStore((state) => state.waistCm);
  const hipCm = useOnboardingStore((state) => state.hipCm);
  const fit = useOnboardingStore((state) => state.fit);
  const skinTone = useOnboardingStore((state) => state.skinTone);
  const eyeColor = useOnboardingStore((state) => state.eyeColor);
  const jewelry = useOnboardingStore((state) => state.jewelry);
  const thermal = useOnboardingStore((state) => state.thermal);
  const forbiddenColors = useOnboardingStore((state) => state.forbiddenColors);

  // One-shot prefill for ?edit=true; the store is the source of truth after.
  useEffect(() => {
    if (initialProfile !== null && !prefilled.current) {
      prefilled.current = true;
      useOnboardingStore.getState().prefillFromProfile(initialProfile);
    }
  }, [initialProfile]);

  // Arm Save shortly after the final step mounts (see SAVE_ARM_DELAY_MS).
  useEffect(() => {
    if (step !== TOTAL_STEPS) {
      return;
    }
    const timer = setTimeout(() => setSaveArmed(true), SAVE_ARM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [step]);

  const canContinue = isStepComplete(step, {
    displayName,
    section,
    style,
    fit,
    skinTone,
    eyeColor,
    jewelry,
  });

  const goNext = () => {
    setSaveArmed(false);
    setDirection(1);
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  };

  const goBack = () => {
    setSaveArmed(false);
    setDirection(-1);
    setStep((current) => Math.max(1, current - 1));
  };

  const goCloset = useCallback(() => {
    router.push("/closet");
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== TOTAL_STEPS || !canContinue || isSaving || !saveArmed) {
      return;
    }
    if (
      section === "" ||
      style === "" ||
      fit === "" ||
      skinTone === "" ||
      eyeColor === ""
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = buildWizardPayload({
      displayName,
      section,
      style,
      skinTone,
      eyeColor,
      chestCm,
      waistCm,
      hipCm,
      fit,
      jewelry,
      thermal,
      forbiddenColors,
    });

    const result = await saveProfileAction({
      skinTone: payload.skinTone,
      eyeColor: payload.eyeColor,
      chestMeasurementCm: payload.chestMeasurementCm,
      waistMeasurementCm: payload.waistMeasurementCm,
      hipMeasurementCm: payload.hipMeasurementCm,
      colorimetry: payload.colorimetry,
      morphology: payload.morphology,
      preferredFit: payload.preferredFit,
      lifestyle: payload.lifestyle,
      extraPreferences: payload.extraPreferences,
    });

    // The server no longer redirects: success transitions to the
    // celebration screen, which navigates to the closet.
    if (result.error !== null) {
      setError(result.error);
      setIsSaving(false);
      return;
    }
    setSucceeded(true);
  };

  if (succeeded) {
    return (
      <MotionConfig reducedMotion="user">
        <section className={styles.page}>
          <OnboardingSuccess onDone={goCloset} />
        </section>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <section className={styles.page}>
        <div
          role="progressbar"
          aria-label={ta("onboardingProgress")}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
          className={styles.progress}
        >
          <div
            className={styles["progress-fill"]}
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <p className={styles["step-counter"]}>
          {t("counter", { step, total: TOTAL_STEPS })}
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className={styles.stage}>
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ x: 56 * direction, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -56 * direction, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={styles.card}
            >
              {step === 1 ? <StepWelcome /> : null}
              {step === 2 ? <StepIdentity /> : null}
              {step === 3 ? <StepMorphology /> : null}
              {step === 4 ? <StepColorimetry /> : null}
              {step === 5 ? <StepFineTuning /> : null}
            </motion.div>
          </AnimatePresence>

          {error !== null ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={isSaving}
              >
                {t("back")}
              </Button>
            ) : null}
            {step < TOTAL_STEPS ? (
              <Button
                type="button"
                variant="primary"
                onClick={goNext}
                disabled={!canContinue}
              >
                {t("continue")}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={!canContinue || isSaving || !saveArmed}
              >
                {isSaving ? t("saving") : t("save")}
              </Button>
            )}
          </div>
        </form>
      </section>
    </MotionConfig>
  );
}
