"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput/PasswordInput";
import { SmartSkeleton } from "@/components/Skeletons/SmartSkeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import { PASSWORD_MIN_LENGTH } from "@/constants/validation";
import {
  REDIRECT_DELAY_MS,
  SESSION_RETRY_DELAY_MS,
} from "@/constants/animations";
import {
  updatePasswordAction,
  type PasswordActionState,
} from "../(auth)/passwordActions";
import styles from "../password.module.scss";
import { AuthCard } from "@/components/AuthCard/AuthCard";
import { FormField } from "@/components/FormField/FormField";
import { SubmitButton } from "@/components/SubmitButton/SubmitButton";

const INITIAL_STATE: PasswordActionState = { error: null, message: null };

type SessionStatus = "checking" | "ready" | "invalid";

function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Expired links arrive with an error param: derive the status during
  // render instead of syncing it in an effect.
  const linkRejected = searchParams.get("error") !== null;
  const [status, setStatus] = useState<SessionStatus>(
    linkRejected ? "invalid" : "checking",
  );
  const [state, formAction, isPending] = useActionState(
    updatePasswordAction,
    INITIAL_STATE,
  );
  const notifiedError = useRef<string | null>(null);

  // Failures surface as floating toasts (guarded against re-notifying the
  // same error). Success shows inline and then lands in the generator.
  useEffect(() => {
    if (state.error !== null && state.error !== notifiedError.current) {
      notifiedError.current = state.error;
      useNotificationStore.getState().addNotification("error", state.error);
    }
    if (state.error === null) {
      notifiedError.current = null;
    }
  }, [state.error]);

  useEffect(() => {
    if (state.message === null) {
      return;
    }
    const timer = setTimeout(() => router.push("/generator"), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.message, router]);

  // The email link lands with a PKCE code that the browser client
  // exchanges automatically; confirm the recovery session (with one
  // retry for the async exchange) before showing the form.
  useEffect(() => {
    if (linkRejected) {
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    const confirmSession = async (attempts: number): Promise<void> => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) {
        return;
      }
      if (data.session) {
        setStatus("ready");
      } else if (attempts > 0) {
        await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_DELAY_MS));
        await confirmSession(attempts - 1);
      } else {
        setStatus("invalid");
      }
    };
    void confirmSession(2);
    return () => {
      cancelled = true;
    };
  }, [linkRejected]);

  return (
    <AuthCard
      title={t("updatePasswordTitle")}
      subtitle={t("updatePasswordSubtitle")}
    >
        {status === "checking" ? (
          <SmartSkeleton label={t("updatePasswordTitle")} />
        ) : status === "invalid" ? (
          <>
            <p role="alert" className="auth-form__error">
              {t("resetInvalid")}
            </p>
            <Link href="/forgot-password" className={styles["back-link"]}>
              {t("sendResetLink")}
            </Link>
          </>
        ) : state.message !== null ? (
          <p role="status" className="auth-form__message">
            {state.message}
          </p>
        ) : (
          <form action={formAction} aria-label={t("updatePasswordTitle")}>
            <FormField htmlFor="new-password" label={t("newPassword")} shape="rounded">
              <PasswordInput
                id="new-password"
                name="password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                placeholder={t("passwordHint")}
                showPasswordLabel={t("showPassword")}
                hidePasswordLabel={t("hidePassword")}
                aria-invalid={state.error !== null}
              />
            </FormField>
            <FormField htmlFor="confirm-password" label={t("confirmPassword")} shape="rounded">
              <PasswordInput
                id="confirm-password"
                name="confirm"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                placeholder={t("passwordHint")}
                showPasswordLabel={t("showPassword")}
                hidePasswordLabel={t("hidePassword")}
                aria-invalid={state.error !== null}
              />
            </FormField>
            <SubmitButton isPending={isPending} pendingLabel={t("waiting")}>
              {t("updatePassword")}
            </SubmitButton>
          </form>
        )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
