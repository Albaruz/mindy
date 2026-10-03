import type { ReactNode } from "react";
import styles from "./EmptyState.module.scss";

interface EmptyStateProps {
  message: string;
  children?: ReactNode;
  testId?: string;
}

// Canonical empty/error state: centered muted message with an actions
// slot (Buttons, links). Replaces the scattered per-view state blocks.
export function EmptyState({ message, children, testId }: EmptyStateProps) {
  return (
    <div className={styles.empty} data-testid={testId}>
      <p className={styles.message}>{message}</p>
      {children !== undefined ? (
        <div className={styles.actions}>{children}</div>
      ) : null}
    </div>
  );
}
