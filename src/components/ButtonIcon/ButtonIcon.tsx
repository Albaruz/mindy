import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./ButtonIcon.module.scss";

export type ButtonIconVariant = "surface" | "favorite" | "favorite-active";

interface ButtonIconProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "aria-label" | "aria-pressed"
  > {
  /** Accessible name. The icon itself is decorative. */
  label: string;
  /** Lucide (or any) icon rendered inside the button. */
  icon: ReactNode;
  /** surface: neutral action; favorite: filled heart; favorite-active: subtle heart. */
  variant?: ButtonIconVariant;
  /** Toggle state exposed through aria-pressed. Omit for one-shot actions. */
  pressed?: boolean;
}

/**
 * Icon-only button with its own touch target, focus ring and visual variants.
 * Keeps the accessible name required so icon-only actions never ship unlabeled.
 */
export function ButtonIcon({
  label,
  icon,
  variant = "surface",
  pressed,
  type = "button",
  className,
  ...props
}: ButtonIconProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        styles["button-icon"],
        styles[`button-icon--${variant}`],
        className,
      )}
    >
      <span className={styles["button-icon__icon"]} aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
