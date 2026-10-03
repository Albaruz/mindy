"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { localizePath } from "@/lib/onboarding";
import { resolveRequestLocale } from "@/lib/serverLocale";

export interface PasswordActionState {
  error: string | null;
  message: string | null;
}

const INITIAL_STATE: PasswordActionState = { error: null, message: null };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requestOrigin(): Promise<string> {
  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";
  return `${proto}://${host}`;
}

// Sends the recovery email. The Supabase link points back here, so the
// redirect target must be whitelisted in Supabase URL configuration.
export async function requestPasswordResetAction(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const t = await getTranslations("Auth");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { ...INITIAL_STATE, error: t("invalidEmail") };
  }

  const supabase = await createClient();
  const locale = await resolveRequestLocale();
  const redirectTo = `${await requestOrigin()}${localizePath("/reset-password", locale)}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    // Log the raw cause server-side: the UI message stays generic so we
    // never leak account-enumeration details to the browser.
    console.error("[password-reset] send failed", {
      redirectTo,
      status: error.status,
      code: (error as { code?: string }).code,
      message: error.message,
    });
    // Rate-limited sends (default Supabase SMTP) get their own message so
    // the user waits instead of hammering the button and extending the ban.
    if (
      error.status === 429 ||
      /rate.?limit/i.test(
        `${(error as { code?: string }).code ?? ""} ${error.message}`,
      )
    ) {
      return { ...INITIAL_STATE, error: t("resetRateLimited") };
    }
    return { ...INITIAL_STATE, error: t("resetRequestFailed") };
  }
  return { ...INITIAL_STATE, message: t("resetSent") };
}

// Sets the new password for the recovery session (established from the
// email link code before this form renders). Returns a success message;
// the client shows it and then navigates to the generator.
export async function updatePasswordAction(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const t = await getTranslations("Auth");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 6) {
    return { ...INITIAL_STATE, error: t("shortPassword") };
  }
  if (password !== confirm) {
    return { ...INITIAL_STATE, error: t("passwordMismatch") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ...INITIAL_STATE, error: t("resetUpdateFailed") };
  }

  revalidatePath("/", "layout");
  return { ...INITIAL_STATE, message: t("passwordUpdated") };
}
