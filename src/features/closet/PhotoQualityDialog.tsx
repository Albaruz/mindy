"use client";

import { Camera, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import { useDialogFocus } from "@/lib/useDialogFocus";
import styles from "./PhotoQualityDialog.module.scss";

interface PhotoQualityDialogProps {
  qualityNote: string | null;
  cutoutFailed: boolean;
  isWorking: boolean;
  progressNote: string | null;
  onRemoveBackground: () => void;
  onUseOriginal: () => void;
  onChangePhoto: () => void;
  onClose: () => void;
}

/** Gives the user control when Vision expects the photo cutout to be tricky. */
export function PhotoQualityDialog({
  qualityNote,
  cutoutFailed,
  isWorking,
  progressNote,
  onRemoveBackground,
  onUseOriginal,
  onChangePhoto,
  onClose,
}: PhotoQualityDialogProps) {
  const t = useTranslations("Closet");
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div className={styles["photoQuality__overlay"]} onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-quality-title"
        aria-describedby="photo-quality-description"
        tabIndex={-1}
        className={styles["photoQuality__dialog"]}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles["photoQuality__header"]}>
          <div className={styles["photoQuality__heading"]}>
            <h2 id="photo-quality-title" className={styles["photoQuality__title"]}>
              {t("qualityTitle")}
            </h2>
          </div>
          <button
            type="button"
            className={styles["photoQuality__close"]}
            onClick={onClose}
            disabled={isWorking}
            aria-label={t("qualityClose")}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className={styles["photoQuality__body"]}>
          <p
            id="photo-quality-description"
            className={styles["photoQuality__message"]}
          >
            {t("qualityMessage")}
          </p>

          {qualityNote !== null && qualityNote !== "" ? (
            <p className={styles["photoQuality__note"]}>
              <Sparkles aria-hidden="true" size={18} />
              <span>{qualityNote}</span>
            </p>
          ) : null}

          {cutoutFailed ? (
            <p role="alert" className={styles["photoQuality__error"]}>
              {t("qualityCutoutFailed")}
            </p>
          ) : null}

          <section
            className={styles["photoQuality__tips"]}
            aria-labelledby="photo-quality-tips-title"
          >
            <h3
              id="photo-quality-tips-title"
              className={styles["photoQuality__tips-title"]}
            >
              {t("qualityTipsTitle")}
            </h3>
            <ul className={styles["photoQuality__tips-list"]}>
              <li>{t("qualityTipBackground")}</li>
              <li>{t("qualityTipLighting")}</li>
              <li>{t("qualityTipFraming")}</li>
            </ul>
          </section>

          {isWorking ? (
            <p
              role="status"
              aria-live="polite"
              className={styles["photoQuality__status"]}
            >
              {progressNote ?? t("qualityWorking")}
            </p>
          ) : null}
        </div>

        <footer className={styles["photoQuality__footer"]}>
          <div className={styles["photoQuality__actions"]}>
            <Button
              type="button"
              variant="primary"
              fullWidth
              disabled={isWorking}
              onClick={onChangePhoto}
            >
              <Camera aria-hidden="true" size={18} />
              {t("qualityChooseAnother")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isWorking}
              onClick={onUseOriginal}
            >
              {t("qualityUseOriginal")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={styles["photoQuality__linkAction"]}
              disabled={isWorking}
              onClick={onRemoveBackground}
            >
              {t("qualityRemoveBackground")}
            </Button>
            {/* TODO(phase 2): Implement the authenticated Cloudflare Workers AI
                flow using Groq's stored garment description. Add the action
                here and require preview confirmation before saving. */}
          </div>
        </footer>
      </div>
    </div>
  );
}
