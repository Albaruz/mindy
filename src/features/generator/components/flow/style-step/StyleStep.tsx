import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import { OptionPills } from "@/components/OptionPills/OptionPills";
import { FavoriteCheck } from "@/components/FavoriteCheck/FavoriteCheck";
import { GARMENT_STYLE_VALUES } from "@/constants/garment";
import type { LookStyle } from "../../../state/generator-store/useGeneratorStore";
import styles from "./StyleStep.module.scss";

interface StyleStepProps {
  value: LookStyle;
  isPending: boolean;
  onChange: (style: LookStyle) => void;
  onConfirm: () => void;
  onBack: () => void;
  hasFavorites: boolean;
  useFavorite: boolean;
  onToggleFavorite: (use: boolean) => void;
}

const OPTIONS: readonly LookStyle[] = GARMENT_STYLE_VALUES;

export function StyleStep({ 
  value, 
  isPending, 
  onChange, 
  onConfirm, 
  onBack, 
  hasFavorites, 
  useFavorite, 
  onToggleFavorite 
}: StyleStepProps) {
  const t = useTranslations("Generator");
  return (
    <div className={styles["style-step"]} data-testid="generator-auto-select">
      <h2 className={styles["style-step__heading"]}>{t("styleHeading")}</h2>
      <OptionPills
        name="look-style"
        label={t("styleHeading")}
        hideLabel
        options={OPTIONS}
        value={value}
        onSelect={onChange}
        formatOption={(option) => t(`styles.${option}`)}
        alignment="center"
      />
      {hasFavorites && (
        <FavoriteCheck
          selected={useFavorite}
          label={t("styleStepSelectFavorite")}
          onClick={() => onToggleFavorite(!useFavorite)}
          disabled={isPending}
          className={styles["style-step__favorite-check"]}
        />
      )}
      <div className={styles["style-step__actions"]}>
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
