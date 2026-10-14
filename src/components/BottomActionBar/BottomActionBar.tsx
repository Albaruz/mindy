"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Lottie } from "lottie-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CELEBRATION_BURST_MS } from "@/constants/animations";
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
  extraRight?: ActionSide;
  animationSrc?: string | object;
}

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
    setBurstKey((key) => key + 1);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setBurstKey(0), CELEBRATION_BURST_MS);
  };

  return (
    <>
      <div role="group" aria-label={label} className={styles["action-bar"]}>
        <div className={styles["action-bar__edge"]} aria-hidden="true" />
        <div className={styles["action-bar__core"]}>
          <SideButton
            {...left}
            className={cn(styles["action-bar__side"], styles["action-bar__side--left"])}
          />
          <button
            type="button"
            onClick={handlePrimary}
            disabled={primaryDisabled || isPrimaryPending}
            aria-label={primaryLabel}
            title={primaryLabel}
            className={styles["action-bar__primary"]}
          >
            <Check aria-hidden="true" size={30} />
            <span className="visually-hidden">{primaryLabel}</span>
          </button>
          <SideButton
            {...right}
            className={cn(styles["action-bar__side"], styles["action-bar__side--right"])}
          />
        </div>
        <div className={styles["action-bar__edge-end"]}>
          {extraRight !== undefined ? (
            <SideButton
              {...extraRight}
              className={cn(styles["action-bar__side"], styles["action-bar__side--right"])}
            />
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
      className={cn(styles["action-bar__side"], className)}
    >
      {icon}
    </button>
  );
}

export function CelebrationBurst({
  animationSrc,
}: {
  animationSrc?: string | object;
}) {
  if (animationSrc !== undefined) {
    return (
      <div className={styles["action-bar__burst"]} aria-hidden="true">
        <Lottie src={animationSrc} loop={false} autoplay className={styles["action-bar__lottie"]} />
      </div>
    );
  }
  return (
    <div className={styles["action-bar__burst"]} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className={cn(styles["action-bar__confetti"], styles[`action-bar__confetti${index % 4}`])}
          style={{ ["--burst-angle" as string]: `${index * 30}deg` }}
        />
      ))}
    </div>
  );
}