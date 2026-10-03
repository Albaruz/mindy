import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import { OptionPills } from "@/components/OptionPills/OptionPills";
import { GARMENT_STYLES } from "@/features/closet/garmentOptions";
import type { LookStyle } from "./useGeneratorStore";
import styles from "./StyleStep.module.scss";

interface StyleStepProps {
  value: LookStyle;
  isPending: boolean;
  onChange: (style: LookStyle) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const OPTIONS: readonly LookStyle[] = GARMENT_STYLES;

export function StyleStep({ value, isPending, onChange, onConfirm, onBack }: StyleStepProps) {
  const t = useTranslations("Generator");
  return (
    <div className={styles.step} data-testid="generator-auto-select">
      <h2 className={styles.heading}>{t("styleHeading")}</h2>
      <OptionPills
        name="look-style"
        label={t("styleHeading")}
        hideLabel
        options={OPTIONS}
        value={value}
        onSelect={onChange}
        formatOption={(option) => t(`styles.${option}`)}
      />
      <div className={styles.actions}>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? t("creating") : t("confirm")}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
      </div>
    </div>
  );
}
