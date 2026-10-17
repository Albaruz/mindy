"use client";

import { useEffect, useRef } from "react";

let scrollLockCount = 0;
let previousDocumentOverflow = "";
let previousBodyOverflow = "";

function lockPageScroll() {
  if (scrollLockCount === 0) {
    previousDocumentOverflow = document.documentElement.style.overflow;
    previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;

  return () => {
    scrollLockCount -= 1;
    if (scrollLockCount === 0) {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
    }
  };
}

// Accessible modal focus management (WCAG 2.1.1, 2.4.3):
// - moves focus into the dialog on mount
// - traps Tab inside the dialog
// - closes on Escape
// - restores focus to the previously focused element on unmount
// - locks document scrolling while one or more dialogs are open
export function useDialogFocus<T extends HTMLElement>(onClose: () => void) {
  const dialogRef = useRef<T | null>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const unlockPageScroll = lockPageScroll();
    const node = dialogRef.current;
    // Focus the dialog itself (tabIndex -1) or its first focusable child.
    const target =
      node?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? null;
    // The dialog is fixed over a potentially scrolled page. Letting the
    // browser scroll the focused control can move the dialog container itself
    // to its scroll limit, leaving a blank-looking modal. Focus it without
    // changing either the page or dialog scroll position.
    (target ?? node)?.focus?.({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || node === null) {
        return;
      }
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      unlockPageScroll();
      const previous = previousFocusRef.current as HTMLElement | null;
      previous?.focus?.();
    };
  }, [onClose]);

  return dialogRef;
}
