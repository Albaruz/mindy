"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button/Button";
import { Link } from "@/i18n/navigation";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import {
  requestPasswordResetAction,
  type PasswordActionState,
} from "../(auth)/passwordActions";
import styles from "../password.module.scss";

const INITIAL_STATE: PasswordActionState = { error: null, message: null };

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );
  const notifiedError = useRef<string | null>(null);

  // Failures surface as floating toasts; the inline success state stays
  // in the card. The ref guards against re-notifying the same error on
  // every render while the action state persists.
  useEffect(() => {
    if (state.error !== null && state.error !== notifiedError.current) {
      notifiedError.current = state.error;
      useNotificationStore.getState().addNotification("error", state.error);
    }
    if (state.error === null) {
      notifiedError.current = null;
    }
  }, [state.error]);

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("resetTitle")}</h1>
        <p className={styles.subtitle}>{t("resetSubtitle")}</p>
        {state.message !== null ? (
          <p role="status" className={styles.message}>
            {state.message}
          </p>
        ) : (
          <form action={formAction} aria-label={t("resetTitle")}>
            <div className={styles.field}>
              <label htmlFor="reset-email">{t("email")}</label>
              <input
                id="reset-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={state.error !== null}
              />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className={styles.submit}
            >
              {isPending ? (
                <span aria-hidden="true" className={styles.spinner} />
              ) : null}
              {isPending ? t("waiting") : t("sendResetLink")}
            </Button>
          </form>
        )}
        <Link href="/" className={styles.backLink}>
          {t("backToLogin")}
        </Link>
      </div>
    </section>
  );
}
