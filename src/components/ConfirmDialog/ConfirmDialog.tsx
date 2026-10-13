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
    <div
      className={`dialog-shell__overlay ${styles["confirm-dialog__overlay"]}`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        tabIndex={-1}
        className={`dialog-shell__container ${styles["confirm-dialog__container"]}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-shell__header">
          <h2 id="confirm-dialog-title" className="dialog-shell__title">
            {title}
          </h2>
        </header>
        <div className="dialog-shell__body">
          <p id="confirm-dialog-message" className="dialog-shell__message">
            {message}
          </p>
        </div>
        <footer className="dialog-shell__footer">
          <div className="dialog-shell__actions">
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
