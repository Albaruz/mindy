"use client";

import { useMemo, useState } from "react";
import { GarmentImage } from "@/components/GarmentImage/GarmentImage";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Garment } from "@/types/garment";
import { Button } from "@/components/Button/Button";
import { useGarmentTranslator } from "@/lib/translateGarment";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { OUTFIT_CELEBRATION } from "@/constants/animations";
import styles from "./OutfitCelebrationScreen.module.scss";

interface OutfitCelebrationScreenProps {
  garments: Garment[];
  onClose: () => void;
}

interface ConfettiParticle {
  angleDeg: number;
  distancePx: number;
  sizePx: number;
  color: string;
  delayS: number;
}

function buildConfetti(
  count: number = OUTFIT_CELEBRATION.confettiCount,
): ConfettiParticle[] {
  return Array.from({ length: count }, (_, index) => ({
    angleDeg:
      (OUTFIT_CELEBRATION.confettiAngleStepDegrees / count) * index +
      (index % OUTFIT_CELEBRATION.confettiAngleJitterCycle) *
        OUTFIT_CELEBRATION.confettiAngleJitterStepDegrees,
    distancePx:
      OUTFIT_CELEBRATION.confettiDistanceBasePx +
      (index % OUTFIT_CELEBRATION.confettiDistanceCycle) *
        OUTFIT_CELEBRATION.confettiDistanceStepPx,
    sizePx:
      OUTFIT_CELEBRATION.confettiSizeBasePx +
      (index % OUTFIT_CELEBRATION.confettiSizeCycle) *
        OUTFIT_CELEBRATION.confettiSizeStepPx,
    color:
      OUTFIT_CELEBRATION.confettiColors[
        index % OUTFIT_CELEBRATION.confettiColors.length
      ],
    delayS:
      OUTFIT_CELEBRATION.confettiDelayBaseSeconds +
      (index % OUTFIT_CELEBRATION.confettiDelayCycle) *
        OUTFIT_CELEBRATION.confettiDelayStepSeconds,
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
  const confetti = useMemo(() => buildConfetti(), []);
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

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
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      tabIndex={-1}
      className={styles["outfit-celebration"]}
      initial={{ opacity: OUTFIT_CELEBRATION.hiddenOpacity }}
      animate={{
        opacity: OUTFIT_CELEBRATION.visibleOpacity,
        transition: {
          duration: reduceMotion
            ? OUTFIT_CELEBRATION.noMotionSeconds
            : OUTFIT_CELEBRATION.fadeInSeconds,
        },
      }}
      exit={{
        opacity: OUTFIT_CELEBRATION.hiddenOpacity,
        transition: { duration: OUTFIT_CELEBRATION.fadeOutSeconds },
      }}
    >
      <div className={styles["outfit-celebration__mask"]}>
        <motion.h2
          id="celebration-title"
          className={styles["outfit-celebration__title"]}
          initial={
            reduceMotion
              ? false
              : { y: OUTFIT_CELEBRATION.titleEnterOffset }
          }
          animate={{ y: OUTFIT_CELEBRATION.titleRestOffset }}
          transition={{
            duration: OUTFIT_CELEBRATION.titleRiseSeconds,
            delay: OUTFIT_CELEBRATION.titleDelaySeconds,
            ease: "easeOut",
          }}
        >
          {line}
        </motion.h2>
      </div>

      <motion.div
        className={styles["outfit-celebration__poster"]}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={{
          show: {
            transition: {
              staggerChildren: OUTFIT_CELEBRATION.pieceStaggerSeconds,
              delayChildren: OUTFIT_CELEBRATION.pieceDelayChildrenSeconds,
            },
          },
        }}
      >
        {garments.map((garment, index) => (
          <motion.figure
            key={garment.garmentId}
            className={styles["outfit-celebration__piece"]}
            variants={{
              hidden: {
                y: OUTFIT_CELEBRATION.pieceEnterOffsetY,
                opacity: OUTFIT_CELEBRATION.hiddenOpacity,
                rotate: 0,
              },
              show: {
                y: 0,
                opacity: 1,
                rotate:
                  OUTFIT_CELEBRATION.pieceTiltsDegrees[
                    index % OUTFIT_CELEBRATION.pieceTiltsDegrees.length
                  ],
                transition: {
                  type: "spring",
                  stiffness: OUTFIT_CELEBRATION.pieceSpringStiffness,
                  damping: OUTFIT_CELEBRATION.pieceSpringDamping,
                },
              },
            }}
          >
            <GarmentImage
              src={garment.imageUrl}
              alt={describeGarment(garment)}
              loading="eager"
              className={styles["outfit-celebration__image"]}
              placeholderClassName={styles["outfit-celebration__placeholder"]}
            />
            <figcaption className={styles["outfit-celebration__caption"]}>
              {describeGarment(garment)}
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>

      {!reduceMotion ? (
        <div className={styles["outfit-celebration__confetti-field"]} aria-hidden="true">
          {confetti.map((particle, index) => (
            <motion.span
              key={index}
              className={styles["outfit-celebration__spark"]}
              style={{
                backgroundColor: particle.color,
                width: particle.sizePx,
                height: particle.sizePx,
              }}
              initial={{
                x: OUTFIT_CELEBRATION.originPx,
                y: OUTFIT_CELEBRATION.originPx,
                opacity: OUTFIT_CELEBRATION.visibleOpacity,
                scale: OUTFIT_CELEBRATION.confettiStartScale,
              }}
              animate={{
                x:
                  Math.cos(
                    particle.angleDeg * OUTFIT_CELEBRATION.radiansPerDegree,
                  ) *
                  particle.distancePx,
                y:
                  Math.sin(
                    particle.angleDeg * OUTFIT_CELEBRATION.radiansPerDegree,
                  ) *
                    particle.distancePx -
                  OUTFIT_CELEBRATION.confettiVerticalOffsetPx,
                opacity: OUTFIT_CELEBRATION.hiddenOpacity,
                scale: OUTFIT_CELEBRATION.confettiEndScale,
              }}
              transition={{
                duration: OUTFIT_CELEBRATION.confettiDurationSeconds,
                delay: particle.delayS,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      ) : null}

      <motion.span
        initial={
          reduceMotion
            ? false
            : {
                y: OUTFIT_CELEBRATION.closeButtonEnterOffsetY,
                opacity: OUTFIT_CELEBRATION.hiddenOpacity,
              }
        }
        animate={{
          y: OUTFIT_CELEBRATION.originPx,
          opacity: OUTFIT_CELEBRATION.visibleOpacity,
        }}
        transition={{
          duration: OUTFIT_CELEBRATION.closeButtonDurationSeconds,
          delay: OUTFIT_CELEBRATION.closeButtonDelaySeconds,
          ease: "easeOut",
        }}
      >
        <Button
          type="button"
          size="lg"
          onClick={onClose}
          className={styles["outfit-celebration__close-button"]}
        >
          {t("celebrationClose")}
        </Button>
      </motion.span>
    </motion.div>
  );
}
