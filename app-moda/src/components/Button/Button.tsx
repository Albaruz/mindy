import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./Button.module.scss";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  // primary: terracotta hero action; secondary: quiet surface action;
  // ghost: borderless text action; danger: destructive outline action.
  variant?: "primary" | "secondary" | "ghost" | "danger";
  // md: 1rem/700 standard buttons; sm: 0.875rem/600 compact buttons;
  // lg: 1.125rem/800 hero buttons (pill) for single-action moments.
  size?: "md" | "sm" | "lg";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(styles.button, styles[variant], styles[size], className)}
      {...props}
    />
  );
}
