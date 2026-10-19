import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Eraser, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./ProcessingOverlay.module.scss";

interface ProcessingOverlayProps {
  message?: string | null;
  blocking?: boolean;
  variant?: "default" | "backgroundRemoval";
}

// Full-screen blocking overlay for multi-step background work (e.g. the
// garment upload pipeline). The backdrop sits above page content, the header
// menu and the action sheet, but below dialogs and toasts.
export function ProcessingOverlay({
  message,
  blocking = false,
  variant = "default",
}: ProcessingOverlayProps) {
  const tc = useTranslations("Common");
  const label = message ?? tc("processing");
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (blocking) overlayRef.current?.focus();
  }, [blocking]);

  const Icon = variant === "backgroundRemoval" ? Eraser : LoaderCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      aria-busy="true"
      tabIndex={blocking ? -1 : undefined}
      ref={overlayRef}
      className={cn(styles.backdrop, blocking && styles["backdrop--blocking"])}
      onKeyDown={
        blocking
          ? (event) => {
              event.preventDefault();
            }
          : undefined
      }
    >
      <div className={styles.card}>
        <Icon
          aria-hidden="true"
          size={28}
          className={cn(
            variant === "backgroundRemoval" ? styles.eraser : "spin",
            styles.spinner,
          )}
        />
        <p className={styles.message}>{message ?? tc("processingEllipsis")}</p>
      </div>
    </div>
  );
}
