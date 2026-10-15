"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";

interface FeatureErrorProps {
  /** Re-runs the failed segment. Provided by the error.tsx boundary. */
  onRetry: () => void;
}

// Shared crash UI for every route error boundary: localized title and
// message with retry (re-renders the failed segment) plus an escape hatch
// back to the generator. Presented as an alert for assistive tech.
export function FeatureError({ onRetry }: FeatureErrorProps) {
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  return (
    <div role="alert">
      <EmptyState
        message={tErrors("title")}
        description={tErrors("message")}
        testId="feature-error"
      >
        <Button type="button" onClick={onRetry}>
          {tCommon("retry")}
        </Button>
        <Link href="/generator">{tErrors("home")}</Link>
      </EmptyState>
    </div>
  );
}
