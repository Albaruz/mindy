"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import { SUCCESS_AUTO_ADVANCE_MS } from "@/constants/animations";
import styles from "../page.module.scss";

// Full-screen success moment: no garment cards, just a drawn celebration
// mark with softly floating sparkles, the Playfair headline and one
// terracotta action into the closet.
const SPARKS = [
  { x: "12%", y: "18%", delay: 0, size: 14 },
  { x: "84%", y: "14%", delay: 0.4, size: 18 },
  { x: "76%", y: "34%", delay: 0.9, size: 12 },
  { x: "18%", y: "38%", delay: 1.2, size: 16 },
  { x: "88%", y: "58%", delay: 0.2, size: 12 },
  { x: "8%", y: "62%", delay: 0.7, size: 18 },
  { x: "70%", y: "72%", delay: 1.1, size: 14 },
  { x: "28%", y: "76%", delay: 0.5, size: 12 },
];

function Spark({
  x,
  y,
  delay,
  size,
}: {
  x: string;
  y: string;
  delay: number;
  size: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      width={size}
      height={size}
      style={{ left: x, top: y }}
      className={styles.spark}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={
        reduce
          ? { opacity: 0.8, scale: 1 }
          : { opacity: [0.2, 0.9, 0.2], scale: [0.7, 1.1, 0.7], y: [0, -10, 0] }
      }
      transition={
        reduce
          ? { duration: 0.4 }
          : { duration: 3.2, repeat: Infinity, delay, ease: "easeInOut" }
      }
    >
      <path
        d="M12 2 C13 8 16 11 22 12 C16 13 13 16 12 22 C11 16 8 13 2 12 C8 11 11 8 12 2 Z"
        fill="#C87966"
      />
    </motion.svg>
  );
}

export function OnboardingSuccess({ onDone }: { onDone: () => void }) {
  const t = useTranslations("Onboarding");
  const reduce = useReducedMotion();

  // Gentle auto-advance for hands-free completion; the button is instant.
  useEffect(() => {
    const timer = setTimeout(onDone, SUCCESS_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={styles.success}
    >
      {SPARKS.map((spark) => (
        <Spark key={`${spark.x}-${spark.y}`} {...spark} />
      ))}
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={t("success-title")}
        className={styles["success-mark"]}
      >
        <motion.circle
          cx={60}
          cy={60}
          r={52}
          fill="none"
          stroke="#4A3F39"
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        <motion.path
          d="M38 62 L54 78 L84 44"
          fill="none"
          stroke="#C87966"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: reduce ? 0 : 0.7, ease: "easeOut" }}
        />
      </svg>
      <h1 className={styles["success-title"]}>{t("success-title")}</h1>
      <Button type="button" variant="primary" onClick={onDone}>
        {t("successCta")}
      </Button>
    </motion.div>
  );
}
