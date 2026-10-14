"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "@/lib/useDialogFocus";

// Compound modal dialog. The root owns the overlay, ARIA wiring and focus
// management (trap, Escape, scroll lock, focus return); the parts only apply
// the global `dialog-shell__*` classes. Per-dialog styling arrives through
// `className` / `overlayClassName`, so no consumer rebuilds the shell.

interface DialogProps {
  /** Called on Escape and overlay click. */
  onClose: () => void;
  /** id of the element that titles the dialog (a DialogTitle). */
  labelledBy: string;
  /** id of the element that describes the dialog, when there is one. */
  describedBy?: string;
  /** alertdialog for confirmations that interrupt the user. */
  role?: "dialog" | "alertdialog";
  className?: string;
  overlayClassName?: string;
  children: ReactNode;
}

export function Dialog({
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  className,
  overlayClassName,
  children,
}: DialogProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div
      className={cn("dialog-shell__overlay", overlayClassName)}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn("dialog-shell__container", className)}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

interface PartProps {
  className?: string;
  children: ReactNode;
}

export function DialogHeader({ className, children }: PartProps) {
  return (
    <header className={cn("dialog-shell__header", className)}>{children}</header>
  );
}

export function DialogTitle({
  id,
  className,
  children,
}: PartProps & { id: string }) {
  return (
    <h2 id={id} className={cn("dialog-shell__title", className)}>
      {children}
    </h2>
  );
}

interface DialogCloseProps {
  /** Accessible name; must be localized by the caller. */
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function DialogClose({
  label,
  onClick,
  disabled,
  className,
}: DialogCloseProps) {
  return (
    <button
      type="button"
      className={cn("dialog-shell__close", className)}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <X aria-hidden="true" size={20} />
    </button>
  );
}

export function DialogBody({ className, children }: PartProps) {
  return <div className={cn("dialog-shell__body", className)}>{children}</div>;
}

export function DialogMessage({
  id,
  className,
  children,
}: PartProps & { id: string }) {
  return (
    <p id={id} className={cn("dialog-shell__message", className)}>
      {children}
    </p>
  );
}

interface DialogFooterProps extends PartProps {
  /** stacked puts each action on its own full-width row. */
  layout?: "inline" | "stacked";
}

export function DialogFooter({
  layout = "inline",
  className,
  children,
}: DialogFooterProps) {
  return (
    <footer
      className={cn(
        "dialog-shell__footer",
        layout === "stacked" && "dialog-shell__footer--stacked",
        className,
      )}
    >
      {children}
    </footer>
  );
}

export function DialogActions({ className, children }: PartProps) {
  return (
    <div className={cn("dialog-shell__actions", className)}>{children}</div>
  );
}
