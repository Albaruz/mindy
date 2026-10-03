"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button/Button";
import { PasswordInput } from "@/components/PasswordInput/PasswordInput";
import { Link } from "@/i18n/navigation";
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
  // TODO(v2.0): Google OAuth parked (handler + states below).
  // const [oauthError, setOauthError] = useState<string | null>(null);
  // const [isOauthPending, setIsOauthPending] = useState(false);

  // OAuth is a redirect flow: the browser leaves for Google and returns
  // to /auth/callback, which applies the post-auth destination rule.
  // const handleGoogleSignIn = async () => {
  //   setOauthError(null);
  //   setIsOauthPending(true);
  //   try {
  //     const supabase = createClient();
  //     const { error } = await supabase.auth.signInWithOAuth({
  //       provider: "google",
  //       options: {
  //         redirectTo: `${window.location.origin}/auth/callback`,
  //       },
  //     });
  //     if (error) {
  //       setOauthError(t("oauthError"));
  //       setIsOauthPending(false);
  //     }
  //     // Success navigates away; nothing else to do here.
  //   } catch {
  //     setOauthError(t("oauthError"));
  //     setIsOauthPending(false);
  //   }
  // };

  return (
    <div>
      <div role="tablist" aria-label={ta("authMode")} className={styles.tabs}>
        <button
          type="button"
          role="tab"
          aria-selected={isLogin}
          className={cn(styles.tab, isLogin && styles.tabActive)}
          onClick={() => setMode("login")}
        >
          {t("login")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isLogin}
          className={cn(styles.tab, !isLogin && styles.tabActive)}
          onClick={() => setMode("signup")}
        >
          {t("signup")}
        </button>
      </div>

      <form action={isLogin ? signInFormAction : signUpFormAction}>
        <div className={styles.field}>
          <label htmlFor="auth-email">{t("email")}</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="auth-password">{t("password")}</label>
          <PasswordInput
            id="auth-password"
            name="password"
            required
            minLength={6}
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder={t("passwordHint")}
            showPasswordLabel={t("showPassword")}
            hidePasswordLabel={t("hidePassword")}
          />
        </div>

        {state.error !== null ? (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        ) : null}
        {state.message !== null ? (
          <p role="status" className={styles.message}>
            {state.message}
          </p>
        ) : null}

        <div className={styles.sessionRow}>
          <label className={styles.remember}>
            <input type="checkbox" name="remember" defaultChecked />
            {t("rememberMe")}
          </label>
          <Link href="/forgot-password" className={styles.forgotLink}>
            {t("forgotPassword")}
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className={styles.submit}
        >
          {isPending ? t("waiting") : isLogin ? t("login") : t("signup")}
        </Button>
      </form>

      {/* TODO(v2.0): Google OAuth parked.
      <div className={styles.divider} aria-hidden="true">
        <span>{t("divider")}</span>
      </div>

      {oauthError !== null ? (
        <p role="alert" className={styles.error}>
          {oauthError}
        </p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        disabled={isOauthPending}
        onClick={() => void handleGoogleSignIn()}
        className={styles.oauthButton}
      >
        {isOauthPending ? t("redirecting") : t("google")}
      </Button>
      */}
    </div>
  );
}
