import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./EmptyState.module.scss";

interface EmptyStateProps {
  /** Main message text. */
  message: string;
  /** Optional description/subtext. */
  description?: string;
  /** Optional icon or illustration. */
  icon?: ReactNode;
  /** Action buttons/links. */
  children?: ReactNode;
  /** Test ID for testing. */
  testId?: string;
  /** Compact variant. */
  compact?: boolean;
}

/**
 * Canonical empty/error state: centered message with optional icon, description, and actions slot.
 * Replaces scattered per-view state blocks.
 */
export function EmptyState({
  message,
  description,
  icon,
  children,
  testId,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(styles.emptyState, compact && styles["emptyState--compact"])}
      data-testid={testId}
    >
      {icon && <div className={styles["emptyState__icon"]}>{icon}</div>}
      <p className={styles["emptyState__message"]}>{message}</p>
      {description && <p className={styles["emptyState__description"]}>{description}</p>}
      {children !== undefined && (
        <div className={styles["emptyState__actions"]}>{children}</div>
      )}
    </div>
  );
}