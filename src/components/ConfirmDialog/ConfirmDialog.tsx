"use client";

import { Button } from "@/components/Button/Button";
import { useDialogFocus } from "@/lib/useDialogFocus";
import styles from "./ConfirmDialog.module.scss";

interface ConfirmDialogProps {
  /** Dialog title. */
  title: string;
  /** Dialog message. */
  message: string;
  /** Confirm button label. */
  confirmLabel: string;
  /** Cancel button label. */
  cancelLabel: string;
  /** Pending state (disables buttons). */
  isPending?: boolean;
  /** Confirm callback. */
  onConfirm: () => void;
  /** Close callback. */
  onClose: () => void;
}

/**
 * Accessible confirmation dialog (WCAG 3.3.1, 4.1.2).
 * Role=alertdialog, labelled by title and described by message.
 * Focus trapped with return-focus handled by shared hook.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div className={styles["confirmDialog__overlay"]} onClick={onClose}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        tabIndex={-1}
        className={styles["confirmDialog__container"]}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles["confirmDialog__header"]}>
          <h2 id="confirm-dialog-title" className={styles["confirmDialog__title"]}>
            {title}
          </h2>
        </header>
        <div className={styles["confirmDialog__body"]}>
          <p id="confirm-dialog-message" className={styles["confirmDialog__message"]}>
            {message}
          </p>
        </div>
        <footer className={styles["confirmDialog__footer"]}>
          <div className={styles["confirmDialog__actions"]}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onConfirm}
              disabled={isPending}
            >
              {confirmLabel}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}