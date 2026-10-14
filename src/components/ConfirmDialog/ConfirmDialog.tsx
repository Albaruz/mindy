"use client";

import { Button } from "@/components/Button/Button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogMessage,
  DialogTitle,
} from "@/components/Dialog/Dialog";
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
 * Focus handling comes from the shared Dialog.
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
  return (
    <Dialog
      role="alertdialog"
      labelledBy="confirm-dialog-title"
      describedBy="confirm-dialog-message"
      onClose={onClose}
      overlayClassName={styles["confirm-dialog__overlay"]}
      className={styles["confirm-dialog__container"]}
    >
      <DialogHeader>
        <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <DialogMessage id="confirm-dialog-message">{message}</DialogMessage>
      </DialogBody>
      <DialogFooter>
        <DialogActions>
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
        </DialogActions>
      </DialogFooter>
    </Dialog>
  );
}