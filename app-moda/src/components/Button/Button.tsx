import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./Button.module.scss";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary: terracotta hero action; secondary: quiet surface action; ghost: borderless text action; danger: destructive outline action. */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** sm: compact; md: standard; lg: hero pill. */
  size?: "sm" | "md" | "lg";
  /** Full width button. */
  fullWidth?: boolean;
  /** Icon-only button (square). */
  iconOnly?: boolean;
  /** Loading state. */
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  iconOnly = false,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        styles.button,
        styles[`button--${variant}`],
        styles[`button--${size}`],
        fullWidth && styles["button--full-width"],
        iconOnly && styles["button--icon-only"],
        loading && styles["button--loading"],
        className
      )}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading ? null : children}
    </button>
  );
}