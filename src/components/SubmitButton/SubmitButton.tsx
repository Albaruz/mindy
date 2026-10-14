import type { ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import styles from "./SubmitButton.module.scss";

interface SubmitButtonProps {
  isPending: boolean;
  /** Localized label shown while pending. */
  pendingLabel: string;
  children: ReactNode;
}

/** Full-width form submit that shows a spinner and a label while pending. */
export function SubmitButton({
  isPending,
  pendingLabel,
  children,
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isPending}
      aria-busy={isPending}
      className="auth-form__submit"
    >
      {isPending ? <span aria-hidden="true" className={styles.spinner} /> : null}
      {isPending ? pendingLabel : children}
    </Button>
  );
}