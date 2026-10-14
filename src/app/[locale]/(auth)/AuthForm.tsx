"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/FormField/FormField";
import { SubmitButton } from "@/components/SubmitButton/SubmitButton";
import { PasswordInput } from "@/components/PasswordInput/PasswordInput";
import { Link } from "@/i18n/navigation";
import {
  PASSWORD_DIGIT_PATTERN,
  PASSWORD_LOWERCASE_PATTERN,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SYMBOL_PATTERN,
  PASSWORD_UPPERCASE_PATTERN,
  SIGNUP_PASSWORD_MIN_LENGTH,
} from "@/constants/validation";
// TODO(v2.0): re-enable Google OAuth (client + button below are parked).
// import { createClient } from "@/lib/supabase/client";
import { signInAction, signUpAction, type AuthActionState } from "./actions";
import styles from "./page.module.scss";

type AuthMode = "login" | "signup";

const INITIAL_STATE: AuthActionState = { error: null, message: null };

export function AuthForm() {
  const t = useTranslations("Auth");
  const ta = useTranslations("Accessibility");
  const [mode, setMode] = useState<AuthMode>("login");
  // Controlled fields so a failed submit keeps what the user typed
  // (email especially) instead of resetting the form.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signInState, signInFormAction, isSigningIn] = useActionState(
    signInAction,
    INITIAL_STATE,
  );
  const [signUpState, signUpFormAction, isSigningUp] = useActionState(
    signUpAction,
    INITIAL_STATE,
  );

  const isLogin = mode === "login";
  const state = isLogin ? signInState : signUpState;
  const isPending = isSigningIn || isSigningUp;

  const handleModeChange = (next: AuthMode) => {
    setMode(next);
    // Keep the email, clear secrets when switching modes.
    setPassword("");
    setConfirm("");
  };

  // Derived during render: live checklist for the sign-up policy.
  const requirements = [
    {
      key: "passwordReqLength",
      met: password.length >= SIGNUP_PASSWORD_MIN_LENGTH,
    },
    {
      key: "passwordReqUpper",
      met: PASSWORD_UPPERCASE_PATTERN.test(password),
    },
    {
      key: "passwordReqLower",
      met: PASSWORD_LOWERCASE_PATTERN.test(password),
    },
    { key: "passwordReqDigit", met: PASSWORD_DIGIT_PATTERN.test(password) },
    {
      key: "passwordReqSymbol",
      met: PASSWORD_SYMBOL_PATTERN.test(password),
    },
    {
      key: "passwordReqMatch",
      met: password.length > 0 && password === confirm,
    },
  ];

  return (
    <div>
      <div role="group" aria-label={ta("authMode")} className={styles.tabs}>
        <button
          type="button"
          aria-pressed={isLogin}
          className={cn(styles.tab, isLogin && styles["tab-active"])}
          onClick={() => handleModeChange("login")}
        >
          {t("login")}
        </button>
        <button
          type="button"
          aria-pressed={!isLogin}
          className={cn(styles.tab, !isLogin && styles["tab-active"])}
          onClick={() => handleModeChange("signup")}
        >
          {t("signup")}
        </button>
      </div>

      <form
        action={isLogin ? signInFormAction : signUpFormAction}
        aria-label={isLogin ? t("login") : t("signup")}
      >
        <FormField htmlFor="auth-email" label={t("email")}>
          <input
            id="auth-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={state.error !== null}
            aria-describedby={state.error !== null ? "auth-form-error" : undefined}
          />
        </FormField>
        <FormField htmlFor="auth-password" label={t("password")}>
          <PasswordInput
            id="auth-password"
            name="password"
            required
            minLength={isLogin ? PASSWORD_MIN_LENGTH : SIGNUP_PASSWORD_MIN_LENGTH}
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder={t("passwordHint")}
            showPasswordLabel={t("showPassword")}
            hidePasswordLabel={t("hidePassword")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={state.error !== null}
            aria-describedby={
              isLogin
                ? state.error !== null
                  ? "auth-form-error"
                  : undefined
                : state.error !== null
                  ? "auth-password-requirements auth-form-error"
                  : "auth-password-requirements"
            }
          />
          {!isLogin ? (
            <div id="auth-password-requirements">
              <p className={styles.hint}>{t("passwordRequirements")}</p>
              <ul className={styles.checklist} aria-live="polite">
                {requirements.map((requirement) => {
                  const Icon = requirement.met ? Check : X;
                  return (
                    <li
                      key={requirement.key}
                      className={cn(
                        styles["check-item"],
                        requirement.met ? styles.met : styles.missing,
                      )}
                    >
                      <Icon aria-hidden="true" size={14} strokeWidth={2.5} />
                      {t(requirement.key)}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </FormField>
        {!isLogin ? (
          <FormField htmlFor="auth-confirm" label={t("confirmPassword")}>
            <PasswordInput
              id="auth-confirm"
              name="confirm"
              required
              minLength={SIGNUP_PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              placeholder={t("confirmPassword")}
              showPasswordLabel={t("showPassword")}
              hidePasswordLabel={t("hidePassword")}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              aria-invalid={state.error !== null}
              aria-describedby={state.error !== null ? "auth-form-error" : undefined}
            />
          </FormField>
        ) : null}

        {state.error !== null ? (
          <p id="auth-form-error" role="alert" className="auth-form__error">
            {state.error}
          </p>
        ) : null}
        {state.message !== null ? (
          <p role="status" className="auth-form__message">
            {state.message}
          </p>
        ) : null}

        <div className={styles["session-row"]}>
          <label className={styles.remember}>
            <input type="checkbox" name="remember" defaultChecked />
            {t("rememberMe")}
          </label>
          <Link href="/forgot-password" className={styles["forgot-link"]}>
            {t("forgotPassword")}
          </Link>
        </div>

        <SubmitButton isPending={isPending} pendingLabel={t("waiting")}>
          {isLogin ? t("login") : t("signup")}
        </SubmitButton>
      </form>

      {/* TODO(v2.0): Google OAuth parked.
      <div className={styles.divider} aria-hidden="true">
        <span>{t("divider")}</span>
      </div>

      {oauthError !== null ? (
        <p role="alert" className="auth-form__error">
          {oauthError}
        </p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        disabled={isOauthPending}
        onClick={() => void handleGoogleSignIn()}
        className={styles["oauth-button"]}
      >
        {isOauthPending ? t("redirecting") : t("google")}
      </Button>
      */}
    </div>
  );
}
