"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Eraser,
  ImagePlus,
  Infinity as InfinityIcon,
  Leaf,
  Snowflake,
  Sun,
} from "lucide-react";
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
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog/Dialog";
import type { GarmentFormInput } from "./useUploadGarment";
import { ExtraTagsEditor } from "./ExtraTagsEditor";
import {
  GARMENT_COLOR_SWATCHES,
  GARMENT_COLORS,
  GARMENT_CUTS,
  GARMENT_MATERIALS,
  GARMENT_STYLES,
  GARMENT_SEASONS,
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
  isImageProcessing?: boolean;
  imageError?: string | null;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (input: GarmentFormInput) => void;
  onChangeImage?: (file: File) => void;
  onRemoveBackground?: () => void;
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
  isImageProcessing = false,
  imageError = null,
  submitError,
  onClose,
  onSubmit,
  onChangeImage,
  onRemoveBackground,
}: GarmentFormModalProps) {
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
  const [selectedStyles, setSelectedStyles] = useState<GarmentStyle[]>(
    initialValues.styles ?? (initialValues.style === "" ? [] : [initialValues.style]),
  );
  const [selectedCuts, setSelectedCuts] = useState<GarmentCut[]>(
    initialValues.cuts ?? (initialValues.cutLength === "" ? [] : [initialValues.cutLength]),
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
      styles: selectedStyles,
      cuts: selectedCuts,
      extraTags,
    });
  };

  return (
    <Dialog
      labelledBy="garment-modal-title"
      describedBy={
        validationError !== null
          ? "garment-modal-error"
          : submitError !== null
            ? "garment-modal-submit-error"
            : undefined
      }
      onClose={onClose}
      overlayClassName={styles["garment-form-modal__overlay"]}
      className={styles["garment-form-modal__dialog"]}
    >
      <DialogHeader className={styles["garment-form-modal__header"]}>
        <DialogTitle
          id="garment-modal-title"
          className={styles["garment-form-modal__title"]}
        >
          {title}
        </DialogTitle>
        <DialogClose
          onClick={onClose}
          label={t("form.close")}
          className={styles["garment-form-modal__close"]}
        />
      </DialogHeader>
      <DialogBody className={styles["garment-form-modal__content"]}>          {previewUrl !== null ? (
            // Blob/object URL of the pending photo: next/image cannot optimize it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={previewAlt} className={styles["garment-form-modal__preview"]} />
          ) : null}
          {onChangeImage !== undefined || onRemoveBackground !== undefined ? (
            <div className={styles["garment-form-modal__image-actions"]}>
              {onChangeImage !== undefined ? (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className={styles["garment-form-modal__file-input"]}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) onChangeImage(file);
                    }}
                  />
                   <Button
                     type="button"
                     variant="secondary"
                     size="sm"
                     iconOnly
                     aria-label={t("imageChooseNew")}
                     disabled={isSaving || isImageProcessing}
                     onClick={() => imageInputRef.current?.click()}
                     className={styles["garment-form-modal__image-action"]}
                   >
                     <ImagePlus aria-hidden="true" size={20} />
                   </Button>
                </>
              ) : null}
              {onRemoveBackground !== undefined ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={t("imageRemoveBackground")}
                  disabled={isSaving || isImageProcessing}
                  onClick={onRemoveBackground}
                  className={styles["garment-form-modal__image-action"]}
                >
                  <Eraser aria-hidden="true" size={20} />
                </Button>
              ) : null}
            </div>
          ) : null}
          {imageError !== null ? (
            <p role="alert" className={styles["garment-form-modal__error"]}>
              {imageError}
            </p>
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

          <OptionPills
            name="season"
            label={t("form.season")}
            options={GARMENT_SEASONS}
            value={season}
            onSelect={setSeason}
            formatOption={(option) => t(`form.seasons.${option}`)}
            renderIcon={(option) => {
              const Icon = SEASON_ICONS[option];
              return <Icon aria-hidden="true" size={18} />;
            }}
          />

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
            value={selectedStyles}
            onSelect={(option) => {
              setSelectedStyles((current) => {
                const next = current.includes(option)
                  ? current.filter((value) => value !== option)
                  : [...current, option];
                setStyle(next[0] ?? "");
                return next;
              });
            }}
            multiple
            formatOption={(option) => translate(option, "style") ?? option}
          />

          <OptionPills
            name="cutLength"
            label={t("form.cut")}
            options={GARMENT_CUTS}
            value={selectedCuts}
            onSelect={(option) => {
              setSelectedCuts((current) => {
                const next = current.includes(option)
                  ? current.filter((value) => value !== option)
                  : [...current, option];
                setCutLength(next[0] ?? "");
                return next;
              });
            }}
            multiple
            formatOption={(option) => translate(option, "cut") ?? option}
          />

          <ExtraTagsEditor tags={extraTags} onChange={setExtraTags} />

          {validationError !== null ? (
            <p
              id="garment-modal-error"
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className={styles["garment-form-modal__error"]}
            >
              {validationError}
            </p>
          ) : null}
          {submitError !== null ? (
            <p id="garment-modal-submit-error" role="alert" className={styles["garment-form-modal__error"]}>
              {submitError}
            </p>
          ) : null}
          <DialogActions className={styles["garment-form-modal__actions"]}>
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
          </DialogActions>
          </form>
      </DialogBody>
    </Dialog>
  );
}
