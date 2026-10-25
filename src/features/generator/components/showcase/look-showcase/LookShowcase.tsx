import { useTranslations } from "next-intl";
import type { AiLook } from "../../../state/generator-store/useGeneratorStore";
import { ShowcaseCard } from "../showcase-card/ShowcaseCard";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import styles from "./LookShowcase.module.scss";

interface LookShowcaseProps {
  look: AiLook;
  position: number;
  total: number;
  isWearing: boolean;
  canWear?: boolean;
  canDiscard: boolean;
  onWear: () => void;
  onDiscard: () => void;
}

// Showcase composition: the swipeable card offers gesture controls while
// wear, discard, and reset remain available in the floating action bar.
export function LookShowcase({
  look,
  position,
  total,
  isWearing,
  canWear = true,
  canDiscard,
  onWear,
  onDiscard,
}: LookShowcaseProps) {
  return (
    <div className={styles["look-showcase"]} data-testid="generator-showcase">
      <ShowcaseCard
        look={look}
        position={position}
        total={total}
        isWearing={isWearing}
        canWear={canWear}
        canDiscard={canDiscard}
        onWear={onWear}
        onDiscard={onDiscard}
      />
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
