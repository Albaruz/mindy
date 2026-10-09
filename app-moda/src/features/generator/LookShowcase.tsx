import { useTranslations } from "next-intl";
import type { AiLook } from "./useGeneratorStore";
import { ShowcaseCard } from "./ShowcaseCard";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import styles from "./LookShowcase.module.scss";

interface LookShowcaseProps {
  look: AiLook;
  position: number;
  total: number;
  isWearing: boolean;
  canDiscard: boolean;
  onWear: () => void;
  onDiscard: () => void;
  onEditManual: () => void;
}

// Showcase composition: swipeable card (wear right, discard left) plus
// the discreet manual-edit escape hatch. Wear/discard/reset actions live
// in the floating bottom action bar as the clickable path.
export function LookShowcase({
  look,
  position,
  total,
  isWearing,
  canDiscard,
  onWear,
  onDiscard,
  onEditManual,
}: LookShowcaseProps) {
  const t = useTranslations("Generator");
  return (
    <div className={styles.lookShowcase} data-testid="generator-showcase">
      <ShowcaseCard
        look={look}
        position={position}
        total={total}
        isWearing={isWearing}
        canDiscard={canDiscard}
        onWear={onWear}
        onDiscard={onDiscard}
      />
      <button
        type="button"
        onClick={onEditManual}
        className={styles["lookShowcase__editLink"]}
      >
        {t("editManual")}
      </button>
    </div>
  );
}

export function ShowcaseEmptyState({
  onManual,
  reason = "exhausted",
}: {
  onManual: () => void;
  reason?: "exhausted" | "limit";
}) {
  const t = useTranslations("Generator");
  return (
    <EmptyState
      message={reason === "limit" ? t("limitMessage") : t("emptyMessage")}
      testId="generator-empty-state"
    >
      <Button type="button" onClick={onManual}>
        {t("emptyButton")}
      </Button>
    </EmptyState>
  );
}
