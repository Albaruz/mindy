"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Lottie } from "lottie-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./BottomActionBar.module.scss";

export interface ActionSide {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
}

interface BottomActionBarProps {
  label: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  isPrimaryPending?: boolean;
  left: ActionSide;
  right: ActionSide;
  // Optional fourth action after the right one (manual mode links it to
  // the automatic style selection).
  extraRight?: ActionSide;
  // Optional Lottie source (JSON object or URL) for the success burst.
  // When omitted, a lightweight CSS confetti placeholder plays instead
  // (no asset weight on mobile).
  animationSrc?: string | object;
}

// Floating command center for look interaction: oversized terracotta
// primary (wear the look) flanked by two secondary circular actions.
// Always clickable: the swipe gesture on the card is an accelerator,
// these buttons are the accessible path.
export function BottomActionBar({
  label,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  isPrimaryPending = false,
  left,
  right,
  extraRight,
  animationSrc,
}: BottomActionBarProps) {
  const [burstKey, setBurstKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const handlePrimary = () => {
    if (primaryDisabled || isPrimaryPending) {
      return;
    }
    onPrimary();
    // Subtle heartbeat burst on accept; clears itself shortly after.
    setBurstKey((key) => key + 1);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setBurstKey(0), 1400);
  };

  return (
    <>
      <div role="group" aria-label={label} className={styles.bar}>
        <div className={styles.edge} aria-hidden="true" />
        <div className={styles.core}>
          <SideButton {...left} className={styles.sideLeft} />
          <button
            type="button"
            onClick={handlePrimary}
            disabled={primaryDisabled || isPrimaryPending}
            aria-label={primaryLabel}
            title={primaryLabel}
            className={styles.primary}
          >
            <Check aria-hidden="true" size={30} />
            <span className={styles.primaryLabel}>{primaryLabel}</span>
          </button>
          <SideButton {...right} className={styles.sideRight} />
        </div>
        <div className={styles.edgeEnd}>
          {extraRight !== undefined ? (
            <SideButton {...extraRight} className={styles.sideRight} />
          ) : null}
        </div>
      </div>
      {burstKey > 0 ? (
        <CelebrationBurst key={burstKey} animationSrc={animationSrc} />
      ) : null}
    </>
  );
}

function SideButton({
  label,
  onClick,
  disabled = false,
  icon,
  className,
}: ActionSide & { className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(styles.side, className)}
    >
      {icon}
    </button>
  );
}

// Success microinteraction placeholder. Drop a Lottie JSON object or URL
// into `animationSrc` to replace the CSS confetti with the real animation.
export function CelebrationBurst({
  animationSrc,
}: {
  animationSrc?: string | object;
}) {
  if (animationSrc !== undefined) {
    return (
      <div className={styles.burst} aria-hidden="true">
        <Lottie src={animationSrc} loop={false} autoplay className={styles.lottie} />
      </div>
    );
  }
  return (
    <div className={styles.burst} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className={cn(styles.confetti, styles[`confetti${index % 4}`])}
          style={{ ["--burst-angle" as string]: `${index * 30}deg` }}
        />
      ))}
    </div>
  );
}
