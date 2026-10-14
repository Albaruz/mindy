import type { ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";

interface QueryStateProps {
  isPending: boolean;
  isError: boolean;
  /** Shown while the first load is pending. */
  pending: ReactNode;
  /** Localized load-error message. */
  errorMessage: string;
  /** Localized label of the retry button. */
  retryLabel: string;
  onRetry: () => void;
  /** Rendered once data is available. */
  children: ReactNode;
}

/** Loading -> error (with retry) -> content, shared by data-backed pages. */
export function QueryState({
  isPending,
  isError,
  pending,
  errorMessage,
  retryLabel,
  onRetry,
  children,
}: QueryStateProps) {
  if (isPending) {
    return pending;
  }
  if (isError) {
    return (
      <EmptyState message={errorMessage}>
        <Button onClick={onRetry}>{retryLabel}</Button>
      </EmptyState>
    );
  }
  return children;
}