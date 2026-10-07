"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  REMEMBER_COOKIE,
  REMEMBER_MAX_AGE_SECONDS,
  REMEMBER_SINCE_COOKIE,
  rememberCookieFlags,
} from "@/lib/supabase/cookies";
import {
  hasCompletedOnboarding,
  localizePath,
  postAuthDestination,
} from "@/lib/onboarding";
import { resolveRequestLocale } from "@/lib/serverLocale";

export interface AuthActionState {
  error: string | null;
  message: string | null;
}

const INITIAL_STATE: AuthActionState = { error: null, message: null };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  return { email, password, remember };
}

// Persists (or clears) the remember-me flag so sign-in cookies and
// middleware refreshes share the same longevity. Must run inside the
// action, before redirect() discards the response.
async function applyRememberChoice(remember: boolean) {
  const cookieStore = await cookies();
  if (remember) {
    cookieStore.set(
      REMEMBER_COOKIE,
      "1",
      rememberCookieFlags(REMEMBER_MAX_AGE_SECONDS),
    );
    cookieStore.set(
      REMEMBER_SINCE_COOKIE,
      String(Math.floor(Date.now() / 1000)),
      rememberCookieFlags(REMEMBER_MAX_AGE_SECONDS),
    );
  } else {
    cookieStore.delete(REMEMBER_COOKIE);
    cookieStore.delete(REMEMBER_SINCE_COOKIE);
  }
}

function validateCredentials(
  email: string,
  password: string,
  t: (key: string) => string,
): string | null {
  if (!EMAIL_PATTERN.test(email)) {
    return t("invalidEmail");
  }
  if (password.length < 6) {
    return t("shortPassword");
  }
  return null;
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslations("Auth");
  const { email, password, remember } = readCredentials(formData);

  const validationError = validateCredentials(email, password, t);
  if (validationError !== null) {
    return { ...INITIAL_STATE, error: validationError };
  }

  const supabase = await createClient({ persistent: remember });
  let userId: string | null = null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { ...INITIAL_STATE, error: t("badCredentials") };
    }
    userId = data.user?.id ?? null;
  } catch {
    return {
      ...INITIAL_STATE,
      error: t("noService"),
    };
  }
  await applyRememberChoice(remember);

  // Fresh sign-in with an incomplete profile goes to the wizard first.
  let destination = "/generator";
  if (userId !== null) {
    const completed = await hasCompletedOnboarding(supabase, userId).catch(
      () => true,
    );
    destination = postAuthDestination(completed);
  }

  revalidatePath("/", "layout");
  redirect(localizePath(destination, await resolveRequestLocale()));
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslations("Auth");
  const { email, password, remember } = readCredentials(formData);

  const validationError = validateCredentials(email, password, t);
  if (validationError !== null) {
    return { ...INITIAL_STATE, error: validationError };
  }

  const supabase = await createClient({ persistent: remember });
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return {
          ...INITIAL_STATE,
          error: t("accountExists"),
        };
      }
      return {
        ...INITIAL_STATE,
        error: t("noService"),
      };
    }

    // Email confirmation required: no session yet, user signs in later.
    if (!data.session) {
      return {
        ...INITIAL_STATE,
        message: t("confirmEmail"),
      };
    }
  } catch {
    return {
      ...INITIAL_STATE,
      error: t("noService"),
    };
  }

  await applyRememberChoice(remember);
  revalidatePath("/", "layout");
  redirect(localizePath("/profile/onboarding", await resolveRequestLocale()));
}
