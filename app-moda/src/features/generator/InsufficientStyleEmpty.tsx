import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";

interface InsufficientStyleEmptyProps {
  onChooseAnother: () => void;
  onManual: () => void;
}

// Empty state for strict style filtering (HTTP 422) and, by copy, for
// the discard-limit: the closet holds no buildable clean look, so the
// showcase explains it in a cheeky tone instead of a generic error.
export function InsufficientStyleEmpty({
  onChooseAnother,
  onManual,
}: InsufficientStyleEmptyProps) {
  const t = useTranslations("Generator");
  return (
    <EmptyState
      message={t("limitMessage")}
      testId="generator-style-shortage"
    >
      <Button type="button" onClick={onChooseAnother}>
        {t("chooseAnother")}
      </Button>
      <Button type="button" variant="secondary" onClick={onManual}>
        {t("manualMode")}
      </Button>
    </EmptyState>
  );
}
