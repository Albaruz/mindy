"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import {
  requestPasswordResetAction,
  type PasswordActionState,
} from "../(auth)/passwordActions";
import styles from "../password.module.scss";
import { AuthCard } from "@/components/AuthCard/AuthCard";
import { FormField } from "@/components/FormField/FormField";
import { SubmitButton } from "@/components/SubmitButton/SubmitButton";

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
    <AuthCard title={t("resetTitle")} subtitle={t("resetSubtitle")}>
        {state.message !== null ? (
          <p role="status" className="auth-form__message">
            {state.message}
          </p>
        ) : (
          <form action={formAction} aria-label={t("resetTitle")}>
            <FormField htmlFor="reset-email" label={t("email")} shape="rounded">
              <input
                id="reset-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={state.error !== null}
              />
            </FormField>
            <SubmitButton isPending={isPending} pendingLabel={t("waiting")}>
              {t("sendResetLink")}
            </SubmitButton>
          </form>
        )}
        <Link href="/" className={styles["back-link"]}>
          {t("backToLogin")}
        </Link>
    </AuthCard>
  );
}
