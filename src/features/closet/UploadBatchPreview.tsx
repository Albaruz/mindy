"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/Button/Button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog/Dialog";
import styles from "./UploadBatchPreview.module.scss";

interface UploadBatchPreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  onStart: () => void;
  onClose: () => void;
}

interface PreviewEntry {
  file: File;
  url: string;
  references: number;
  revokeTimer: number | null;
}

const previewCache = new WeakMap<File, PreviewEntry>();

function getPreviewEntry(file: File): PreviewEntry {
  const cached = previewCache.get(file);
  if (cached !== undefined) {
    if (cached.revokeTimer !== null) {
      window.clearTimeout(cached.revokeTimer);
      cached.revokeTimer = null;
    }
    return cached;
  }
  const entry: PreviewEntry = {
    file,
    url: URL.createObjectURL(file),
    references: 0,
    revokeTimer: null,
  };
  previewCache.set(file, entry);
  return entry;
}

export function UploadBatchPreview({
  files,
  onRemove,
  onStart,
  onClose,
}: UploadBatchPreviewProps) {
  const t = useTranslations("UploadQueue");
  const previewEntries = useMemo(
    () => files.map((file) => getPreviewEntry(file)),
    [files],
  );

  useEffect(() => {
    previewEntries.forEach((entry) => {
      entry.references += 1;
    });
    return () => {
      previewEntries.forEach((entry) => {
        entry.references -= 1;
        if (entry.references === 0) {
          entry.revokeTimer = window.setTimeout(() => {
            if (entry.references === 0) {
              URL.revokeObjectURL(entry.url);
              previewCache.delete(entry.file);
            }
          }, 0);
        }
      });
    };
  }, [previewEntries]);

  return (
    <Dialog
      labelledBy="upload-batch-preview-title"
      describedBy="upload-batch-preview-description"
      onClose={onClose}
      overlayClassName={styles["upload-batch-preview__overlay"]}
      className={styles["upload-batch-preview__dialog"]}
    >
      <DialogHeader>
        <DialogTitle id="upload-batch-preview-title">
          {t("batchTitle")}
        </DialogTitle>
        <DialogClose label={t("close")} onClick={onClose} />
      </DialogHeader>
      <DialogBody className={styles["upload-batch-preview__body"]}>
        <p
          id="upload-batch-preview-description"
          className={styles["upload-batch-preview__description"]}
        >
          {t("batchDescription", { count: files.length })}
        </p>
        <ul className={styles["upload-batch-preview__grid"]}>
          {files.map((file, index) => (
            <li
              className={styles["upload-batch-preview__item"]}
              key={`${file.name}-${file.lastModified}-${index}`}
            >
              {/* Local object URLs are intentionally not optimized by Next Image. */}
              {previewEntries[index] !== undefined ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewEntries[index].url}
                  alt=""
                  aria-hidden="true"
                />
              ) : null}
              <button
                type="button"
                className={styles["upload-batch-preview__remove"]}
                aria-label={t("batchRemove", { name: file.name })}
                onClick={() => onRemove(index)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </DialogBody>
      <DialogFooter>
        <DialogActions className={styles["upload-batch-preview__actions"]}>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={files.length === 0}
            onClick={onStart}
          >
            {t("batchStart")}
          </Button>
        </DialogActions>
      </DialogFooter>
    </Dialog>
  );
}
