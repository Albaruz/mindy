"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Infinity as InfinityIcon, Leaf, Snowflake, Sun } from "lucide-react";
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
  initialValues,
  previewUrl,
  previewAlt,
  isSaving,
  submitError,
  onClose,
  onSubmit,
}: GarmentFormModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
    <div className={styles.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="garment-modal-title"
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="garment-modal-title" className={styles.title}>
          {title}
        </h2>
        {previewUrl !== null ? (
          <img src={previewUrl} alt={previewAlt} className={styles.preview} />
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

          <fieldset className={styles.group}>
            <legend>{t("form.season")}</legend>
            <div className={styles.options} role="radiogroup" aria-label={t("form.season")}>
              {(Object.keys(SEASON_ICONS) as GarmentSeason[]).map((option) => {
                const Icon = SEASON_ICONS[option];
                const selected = season === option;
                return (
                  <label
                    key={option}
                    className={cn(styles.option, selected && styles.selected)}
                  >
                    <input
                      type="radio"
                      name="season"
                      value={option}
                      checked={selected}
                      onChange={() => setSeason(option)}
                      className={styles.radio}
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
            <p role="alert" className={styles.error}>
              {validationError}
            </p>
          ) : null}
          {submitError !== null ? (
            <p role="alert" className={styles.error}>
              {submitError}
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
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
