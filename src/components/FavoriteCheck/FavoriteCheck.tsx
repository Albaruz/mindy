"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./FavoriteCheck.module.scss";

interface FavoriteCheckProps {
  /** Mode - affects accessibility role only, not visual appearance */
  mode?: "toggle" | "picker";
  /** Whether the check is selected */
  selected: boolean;
  /** Accessible name and, by default, visible label */
  label?: string;
  /** Hide the visual label while retaining the accessible name */
  hideLabel?: boolean;
  /** Click handler */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Icon size */
  size?: number;
  /** Stroke width (default 2) */
  strokeWidth?: number;
}

/**
 * Unified favorite check component - IDENTICAL visual appearance everywhere.
 * Used for both filter toggle (closet) and item selection (picker).
 * Visual: always shows heart + label, red background only when selected.
 * Logic lives in the view controller.
 */
export function FavoriteCheck({
  mode = "toggle",
  selected,
  label,
  hideLabel = false,
  onClick,
  disabled = false,
  className,
  size = 18,
  strokeWidth = 2,
}: FavoriteCheckProps) {
  return (
    <button
      type="button"
      role={mode === "picker" ? "menuitemcheckbox" : "checkbox"}
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        styles.check,
        selected && styles["check--selected"],
        hideLabel && styles["check--hide-label"],
        disabled && styles["check--disabled"],
        className
      )}
    >
      <Heart
        aria-hidden="true"
        size={size}
        strokeWidth={strokeWidth}
        className={cn(
          styles.heart,
          selected && styles["heart--selected"]
        )}
      />
      <span className={styles.label}>{label}</span>
    </button>
  );
}
