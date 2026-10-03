import { useTranslations } from "next-intl";
import { LoaderCircle } from "lucide-react";
import styles from "./ProcessingOverlay.module.scss";

interface ProcessingOverlayProps {
  message?: string | null;
}

// Full-screen blocking overlay for multi-step background work (e.g. the
// garment upload pipeline). The backdrop sits above page content and the
// action sheet, but below toasts, so success/error bubbles stay visible.
export function ProcessingOverlay({ message }: ProcessingOverlayProps) {
  const tc = useTranslations("Common");
  const label = message ?? tc("processing");
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={styles.backdrop}
    >
      <div className={styles.card}>
        <LoaderCircle
          aria-hidden="true"
          size={28}
          className={styles.spinner}
        />
        <p className={styles.message}>{message ?? tc("processingEllipsis")}</p>
      </div>
    </div>
  );
}
