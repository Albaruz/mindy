"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Infinity as InfinityIcon, Leaf, Snowflake, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGarmentTranslator } from "@/lib/translateGarment";
import type {
  GarmentColor,
  GarmentCut,
  GarmentMaterial,
  GarmentSeason,
  GarmentStyle,
  GarmentType,
} from "@/types/garment";
import { Button } from "@/components/Button/Button";
import { ColorSwatches } from "@/components/ColorSwatches/ColorSwatches";
import { OptionPills } from "@/components/OptionPills/OptionPills";
import { useDialogFocus } from "@/lib/useDialogFocus";
import type { GarmentFormInput } from "./useUploadGarment";
import { ExtraTagsEditor } from "./ExtraTagsEditor";
import {
  GARMENT_COLOR_SWATCHES,
  GARMENT_COLORS,
  GARMENT_CUTS,
  GARMENT_MATERIALS,
  GARMENT_STYLES,
  GARMENT_TYPES,
} from "./garmentOptions";
import styles from "./GarmentFormModal.module.scss";

interface GarmentFormModalProps {
  title: string;
  submitLabel: string;
  savingLabel: string;
  cancelLabel: string;
  initialValues: GarmentFormInput;
  previewUrl: string | null;
  previewAlt: string;
  isSaving: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (input: GarmentFormInput) => void;
}

const SEASON_ICONS: Record<GarmentSeason, typeof Sun> = {
  summer: Sun,
  winter: Snowflake,
  mid_season: Leaf,
  all: InfinityIcon,
};

// Shared create/edit form for garments. Every field is a closed
// vocabulary (same enum as season): the quick picks ARE the value.
// Specific names (sneakers, turquoise) live in extra_tags, not here.
export function GarmentFormModal({
  title,
  submitLabel,
  savingLabel,
  cancelLabel,
  initialValues,
  previewUrl,
  previewAlt,
  isSaving,
  submitError,
  onClose,
  onSubmit,
}: GarmentFormModalProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const [garmentType, setGarmentType] = useState<GarmentType | "">(
    initialValues.garmentType,
  );
  const [season, setSeason] = useState<GarmentSeason | "">(initialValues.season);
  const [color, setColor] = useState<GarmentColor | "">(initialValues.color);
  const [material, setMaterial] = useState<GarmentMaterial | "">(
    initialValues.material,
  );
  const [style, setStyle] = useState<GarmentStyle | "">(initialValues.style);
  const [cutLength, setCutLength] = useState<GarmentCut | "">(
    initialValues.cutLength,
  );
  const [extraTags, setExtraTags] = useState<Record<string, string>>(
    initialValues.extraTags,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const t = useTranslations("Closet");
  const { translate } = useGarmentTranslator();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (garmentType === "") {
      setValidationError(t("form.validation"));
      // Move screen-reader and keyboard focus to the announced error (WCAG 3.3.1).
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setValidationError(null);
    onSubmit({
      garmentType,
      season,
      color,
      material,
      style,
      cutLength,
      extraTags,
    });
  };

  return (
    <div className={styles["garmentFormModal__overlay"]} onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="garment-modal-title"
        aria-describedby={
          validationError !== null
            ? "garment-modal-error"
            : submitError !== null
              ? "garment-modal-submit-error"
              : undefined
        }
        tabIndex={-1}
        className={styles["garmentFormModal__dialog"]}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles["garmentFormModal__header"]}>
          <h2 id="garment-modal-title" className={styles["garmentFormModal__title"]}>
            {title}
          </h2>
          <button
            type="button"
            className={styles["garmentFormModal__close"]}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        {previewUrl !== null ? (
          <img src={previewUrl} alt={previewAlt} className={styles["garmentFormModal__preview"]} />
        ) : null}
        <form onSubmit={handleSubmit}>
          <OptionPills
            name="garmentType"
            label={t("form.type")}
            options={GARMENT_TYPES}
            value={garmentType}
            onSelect={setGarmentType}
            formatOption={(option) => translate(option, "type") ?? option}
          />

          <fieldset className={styles["garmentFormModal__group"]}>
            <legend>{t("form.season")}</legend>
            <div className={styles["garmentFormModal__options"]} role="radiogroup" aria-label={t("form.season")}>
              {(Object.keys(SEASON_ICONS) as GarmentSeason[]).map((option) => {
                const Icon = SEASON_ICONS[option];
                const selected = season === option;
                return (
                  <label
                    key={option}
                    className={cn(styles["garmentFormModal__option"], selected && styles["garmentFormModal__option--selected"])}
                  >
                    <input
                      type="radio"
                      name="season"
                      value={option}
                      checked={selected}
                      onChange={() => setSeason(option)}
                      className={styles["garmentFormModal__radio"]}
                    />
                    <Icon aria-hidden="true" size={18} />
                    <span>{t(`form.seasons.${option}`)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <ColorSwatches
            name="color"
            label={t("form.color")}
            options={GARMENT_COLORS}
            swatches={GARMENT_COLOR_SWATCHES}
            value={color}
            onSelect={setColor}
            formatOption={(option) => translate(option, "color") ?? option}
          />

          <OptionPills
            name="material"
            label={t("form.material")}
            options={GARMENT_MATERIALS}
            value={material}
            onSelect={setMaterial}
            formatOption={(option) => translate(option, "material") ?? option}
          />

          <OptionPills
            name="style"
            label={t("form.style")}
            options={GARMENT_STYLES}
            value={style}
            onSelect={setStyle}
            formatOption={(option) => translate(option, "style") ?? option}
          />

          <OptionPills
            name="cutLength"
            label={t("form.cut")}
            options={GARMENT_CUTS}
            value={cutLength}
            onSelect={setCutLength}
            formatOption={(option) => translate(option, "cut") ?? option}
          />

          <ExtraTagsEditor tags={extraTags} onChange={setExtraTags} />

          {validationError !== null ? (
            <p
              id="garment-modal-error"
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className={styles["garmentFormModal__error"]}
            >
              {validationError}
            </p>
          ) : null}
          {submitError !== null ? (
            <p id="garment-modal-submit-error" role="alert" className={styles["garmentFormModal__error"]}>
              {submitError}
            </p>
          ) : null}
          <div className={styles["garmentFormModal__actions"]}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? savingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
