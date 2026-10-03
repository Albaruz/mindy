"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Garment } from "@/types/garment";
import { Button } from "@/components/Button/Button";
import { useGarmentTranslator } from "@/lib/translateGarment";
import styles from "./OutfitCelebrationScreen.module.scss";

interface OutfitCelebrationScreenProps {
  garments: Garment[];
  onClose: () => void;
}

// Editorial tilt per poster piece, cycling for larger looks.
const PIECE_TILTS = [-7, 5, -4, 6, -5];

// Terracotta-led particle palette (Warm Refuge).
const CONFETTI_COLORS = ["#c87966", "#c87966", "#4a3f39", "#e0a58f", "#c87966"];

interface ConfettiParticle {
  angleDeg: number;
  distancePx: number;
  sizePx: number;
  color: string;
  delayS: number;
}

function buildConfetti(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, index) => ({
    angleDeg: (360 / count) * index + (index % 3) * 9,
    distancePx: 90 + (index % 4) * 38,
    sizePx: 6 + (index % 3) * 3,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    delayS: 0.55 + (index % 5) * 0.06,
  }));
}

// Full-screen reward overlay after wearing a look (both generator modes).
// Choreography: masked Playfair title rises, garment pieces drop in with
// spring stagger, terracotta confetti bursts, then the close action.
export function OutfitCelebrationScreen({
  garments,
  onClose,
}: OutfitCelebrationScreenProps) {
  const t = useTranslations("Generator");
  const ta = useTranslations("Accessibility");
  const { translate, translateDetail } = useGarmentTranslator();
  const reduceMotion = useReducedMotion();

  const lines = useMemo(
    () => t.raw("celebrationLines") as unknown as string[],
    [t],
  );
  const [line] = useState(
    () =>
      (Array.isArray(lines) && lines.length > 0
        ? lines[Math.floor(Math.random() * lines.length)]
        : "") ?? "",
  );
  const confetti = useMemo(() => buildConfetti(16), []);

  // Escape leaves; the hero button autofocuses itself.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const describeGarment = (garment: Garment) =>
    translate(garment.garmentType, "type") ??
    translateDetail(
      typeof garment.extraTags.specificType === "string"
        ? garment.extraTags.specificType
        : null,
    ) ??
    t("garmentFallback");

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={ta("outfitCelebration")}
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: reduceMotion ? 0 : 0.25 } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <div className={styles.mask}>
        <motion.h1
          className={styles.title}
          initial={reduceMotion ? false : { y: "110%" }}
          animate={{ y: "0%" }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        >
          {line}
        </motion.h1>
      </div>

      <motion.div
        className={styles.poster}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={{
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
        }}
      >
        {garments.map((garment, index) => (
          <motion.figure
            key={garment.garmentId}
            className={styles.piece}
            variants={{
              hidden: { y: -140, opacity: 0, rotate: 0 },
              show: {
                y: 0,
                opacity: 1,
                rotate: PIECE_TILTS[index % PIECE_TILTS.length],
                transition: { type: "spring", stiffness: 260, damping: 19 },
              },
            }}
          >
            {garment.imageUrl !== null ? (
              <img
                src={garment.imageUrl}
                alt={describeGarment(garment)}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className={styles.image}
              />
            ) : (
              <div className={styles.placeholder} aria-hidden="true" />
            )}
            <figcaption className={styles.caption}>
              {describeGarment(garment)}
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>

      {!reduceMotion ? (
        <div className={styles.confettiField} aria-hidden="true">
          {confetti.map((particle, index) => (
            <motion.span
              key={index}
              className={styles.spark}
              style={{
                backgroundColor: particle.color,
                width: particle.sizePx,
                height: particle.sizePx,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x:
                  Math.cos((particle.angleDeg * Math.PI) / 180) *
                  particle.distancePx,
                y:
                  Math.sin((particle.angleDeg * Math.PI) / 180) *
                    particle.distancePx -
                  30,
                opacity: 0,
                scale: 0.4,
              }}
              transition={{
                duration: 1.1,
                delay: particle.delayS,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      ) : null}

      <motion.span
        initial={reduceMotion ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.9, ease: "easeOut" }}
      >
        <Button
          type="button"
          size="lg"
          autoFocus
          onClick={onClose}
          className={styles.closeButton}
        >
          {t("celebrationClose")}
        </Button>
      </motion.span>
    </motion.div>
  );
}
