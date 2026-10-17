"use client";

import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { GarmentImage } from "@/components/GarmentImage/GarmentImage";
import type { PanInfo } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGarmentTranslator } from "@/lib/translateGarment";
import { SWIPE_COMMIT_PX, SWIPE_FADE_START_PX } from "@/constants/animations";
import type { AiLook } from "./useGeneratorStore";
import styles from "./ShowcaseCard.module.scss";

// Lateral commitment threshold: predictable on mobile, never twitchy.

interface ShowcaseCardProps {
  look: AiLook;
  position: number;
  total: number;
  isWearing: boolean;
  canWear?: boolean;
  canDiscard: boolean;
  onWear: () => void;
  onDiscard: () => void;
}

/**
 * Main look card with lateral swipe physics. Drag right wears the look,
 * drag left discards it (while the rejection budget lasts). The floating
 * bottom action bar stays as the clickable path for both actions.
 */
export function ShowcaseCard({
  look,
  position,
  total,
  isWearing,
  canWear = true,
  canDiscard,
  onWear,
  onDiscard,
}: ShowcaseCardProps) {
  const t = useTranslations("Generator");
  const ta = useTranslations("Accessibility");
  const { translate, translateDetail } = useGarmentTranslator();
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  // Gentle tilt following the drag; overlays fade in near the threshold.
  const rotate = useTransform(x, [-200, 200], [-6, 6]);
  const acceptOpacity = useTransform(x, [SWIPE_FADE_START_PX, SWIPE_COMMIT_PX], [0, 1]);
  const rejectOpacity = useTransform(x, [-SWIPE_FADE_START_PX, -SWIPE_COMMIT_PX], [0, 1]);
  const draggable = !reduceMotion && !isWearing;
  const describeGarment = (garment: (typeof look.garments)[number]) =>
    translate(garment.garmentType, "type") ??
    translateDetail(
      typeof garment.extraTags.specificType === "string"
        ? garment.extraTags.specificType
        : null,
    ) ??
    t("garmentFallback");

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.x >= SWIPE_COMMIT_PX && canWear) {
      onWear();
    } else if (info.offset.x <= -SWIPE_COMMIT_PX && canDiscard) {
      onDiscard();
    }
  };

  return (
    <motion.article
      // Key remount per look drives the enter transition without
      // blocking the discard interaction.
      key={look.id}
      aria-live="polite"
      aria-label={ta("lookCard", { position, total })}
      className={styles["showcase-card"]}
      drag={draggable ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragDirectionLock
      dragMomentum={false}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      style={draggable ? { x, rotate } : undefined}
    >
      <span aria-hidden="true" className="visually-hidden">
        {ta("swipeHint")}
      </span>
      <motion.span
        aria-hidden="true"
        className={cn(
          styles["showcase-card__overlay"],
          styles["showcase-card__overlay--accept"]
        )}
        style={draggable ? { opacity: acceptOpacity } : undefined}
      >
        <Check size={20} />
        {t("wear")}
      </motion.span>
      <motion.span
        aria-hidden="true"
        className={cn(
          styles["showcase-card__overlay"],
          styles["showcase-card__overlay--reject"]
        )}
        style={draggable ? { opacity: rejectOpacity } : undefined}
      >
        <X size={20} />
        {t("discard")}
      </motion.span>
      <div className={styles["showcase-card__grid"]}>
        {look.garments.map((garment) => (
          <figure key={garment.garmentId} className={styles["showcase-card__item"]}>
            <GarmentImage
              src={garment.imageUrl}
              alt={describeGarment(garment)}
              className={styles["showcase-card__image"]}
              placeholderClassName={styles["showcase-card__placeholder"]}
            />
            <figcaption className={styles["showcase-card__caption"]}>
              {describeGarment(garment)}
            </figcaption>
          </figure>
        ))}
      </div>
      {look.reason !== null && look.reason !== "" ? (
        <p className={styles["showcase-card__reason"]}>{look.reason}</p>
      ) : null}
    </motion.article>
  );
}
