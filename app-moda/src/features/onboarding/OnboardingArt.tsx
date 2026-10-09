// Onboarding art: the five transparent illustrations with a simple,
// attractive entrance (fade, rise, settle) plus a gentle perpetual float.
// Reduced motion is handled by the wizard MotionConfig and the CSS fallback.
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import styles from "./OnboardingArt.module.scss";

const ART = {
  1: "/illustrations/onboarding-1-hanger.png",
  2: "/illustrations/onboarding-2-outfit.png",
  3: "/illustrations/onboarding-3-tape.png",
  4: "/illustrations/onboarding-4-palette.png",
  5: "/illustrations/onboarding-5-thermometer.png",
} as const;

export type OnboardingArtStep = keyof typeof ART;

interface OnboardingArtProps {
  step: OnboardingArtStep;
  label: string;
  className?: string;
}

export function OnboardingArt({ step, label, className }: OnboardingArtProps) {
  return (
    <div role="img" aria-label={label} className={cn(styles.onboardingArt, className)}>
      <motion.div
        aria-hidden="true"
        className={styles["onboardingArt__float"]}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        {/* Local static PNGs: next/image cannot meaningfully optimize these
        small vectors-turned-raster and would only add client JS. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART[step]}
          alt=""
          draggable={false}
          className={styles["onboardingArt__player"]}
        />
      </motion.div>
    </div>
  );
}