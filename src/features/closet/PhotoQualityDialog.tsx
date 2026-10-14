"use client";

import { Camera, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogMessage,
  DialogTitle,
} from "@/components/Dialog/Dialog";
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

  return (
    <Dialog
      labelledBy="photo-quality-title"
      describedBy="photo-quality-description"
      onClose={onClose}
      overlayClassName={styles["photo-quality__overlay"]}
      className={styles["photo-quality__dialog"]}
    >
      <DialogHeader>
        <div className={styles["photo-quality__heading"]}>
          <DialogTitle
            id="photo-quality-title"
            className={styles["photo-quality__title"]}
          >
            {t("qualityTitle")}
          </DialogTitle>
        </div>
        <DialogClose
          onClick={onClose}
          disabled={isWorking}
          label={t("qualityClose")}
        />
      </DialogHeader>

      <DialogBody className={styles["photo-quality__body"]}>
        <DialogMessage id="photo-quality-description">
          {t("qualityMessage")}
        </DialogMessage>

        {qualityNote !== null && qualityNote !== "" ? (
          <p className={styles["photo-quality__note"]}>
            <Sparkles aria-hidden="true" size={18} />
            <span>{qualityNote}</span>
          </p>
        ) : null}

        {cutoutFailed ? (
          <p role="alert" className={styles["photo-quality__error"]}>
            {t("qualityCutoutFailed")}
          </p>
        ) : null}

        <section
          className={styles["photo-quality__tips"]}
          aria-labelledby="photo-quality-tips-title"
        >
          <h3
            id="photo-quality-tips-title"
            className={styles["photo-quality__tips-title"]}
          >
            {t("qualityTipsTitle")}
          </h3>
          <ul className={styles["photo-quality__tips-list"]}>
            <li>{t("qualityTipBackground")}</li>
            <li>{t("qualityTipLighting")}</li>
            <li>{t("qualityTipFraming")}</li>
          </ul>
        </section>

        {isWorking ? (
          <p
            role="status"
            aria-live="polite"
            className={styles["photo-quality__status"]}
          >
            {progressNote ?? t("qualityWorking")}
          </p>
        ) : null}
      </DialogBody>

      <DialogFooter layout="stacked" className={styles["photo-quality__footer"]}>
        <div className={styles["photo-quality__actions"]}>
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
            className={styles["photo-quality__link-action"]}
            disabled={isWorking}
            onClick={onRemoveBackground}
          >
            {t("qualityRemoveBackground")}
          </Button>
          {/* TODO(phase 2): Implement the authenticated Cloudflare Workers AI
              flow using Groq's stored garment description. Add the action
              here and require preview confirmation before saving. */}
        </div>
      </DialogFooter>
    </Dialog>
  );
}
