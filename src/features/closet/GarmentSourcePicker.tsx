"use client";

import { useCallback, useRef, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Camera, ImagePlus, Plus } from "lucide-react";
import { useDialogFocus } from "@/lib/useDialogFocus";
import styles from "./GarmentSourcePicker.module.scss";

interface GarmentSourcePickerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the photo the user took or picked. */
  onFile: (file: File) => void;
  /** Called with the gallery selection when multiple upload is supported. */
  onFiles?: (files: File[]) => void;
}

interface SourceSheetProps {
  onClose: () => void;
  onCamera: () => void;
  onUpload: () => void;
}

function SourceSheet({ onClose, onCamera, onUpload }: SourceSheetProps) {
  const t = useTranslations("Closet");
  const ta = useTranslations("Accessibility");
  const sheetRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div className={styles["sheet-backdrop"]} onClick={onClose}>
      <div
        id="add-garment-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ta("addGarmentFrom")}
        tabIndex={-1}
        className={styles.sheet}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles["sheet-option"]}
          onClick={onCamera}
        >
          <Camera aria-hidden="true" size={22} />
          {t("takePhoto")}
        </button>
        <button
          type="button"
          className={styles["sheet-option"]}
          onClick={onUpload}
        >
          <ImagePlus aria-hidden="true" size={22} />
          {t("uploadImage")}
        </button>
      </div>
    </div>
  );
}

// "Add garment" entry point: floating button, source sheet (camera or
// gallery) and the two hidden file inputs. The parent owns `isOpen` so other
// flows (empty state, photo-quality dialog) can open it too.
export function GarmentSourcePicker({
  isOpen,
  onOpenChange,
  onFile,
  onFiles,
}: GarmentSourcePickerProps) {
  const ta = useTranslations("Accessibility");
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const closeSheet = useCallback(() => {
    onOpenChange(false);
    fabRef.current?.focus();
  }, [onOpenChange]);

  const pick = (input: HTMLInputElement | null) => {
    onOpenChange(false);
    input?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }
    if (onFiles !== undefined && files.length > 1) {
      onFiles(files);
      return;
    }
    onFile(files[0]);
  };

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-hidden="true"
        tabIndex={-1}
        className={styles["file-input"]}
        onChange={handleFileChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        aria-hidden="true"
        tabIndex={-1}
        className={styles["file-input"]}
        onChange={handleFileChange}
      />
      <button
        ref={fabRef}
        type="button"
        aria-label={ta("addGarment")}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="add-garment-sheet"
        className={styles.fab}
        onClick={() => onOpenChange(!isOpen)}
      >
        <Plus aria-hidden="true" size={28} />
      </button>
      {isOpen ? (
        <SourceSheet
          onClose={closeSheet}
          onCamera={() => pick(cameraInputRef.current)}
          onUpload={() => pick(uploadInputRef.current)}
        />
      ) : null}
    </>
  );
}
