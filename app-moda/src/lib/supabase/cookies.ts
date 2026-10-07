// "Remember me" plumbing: Supabase SSR auth cookies are session-scoped
// by default (forgotten when the browser closes). A persistent opt-in is
// tracked with the flag cookie below; auth cookies then carry a 30-day
// max-age on sign-in and on every middleware refresh.
//
// Both cookies are HttpOnly + SameSite=Lax (+ Secure in production): the
// browser never needs to read them, so JavaScript cannot steal or forge
// the longevity choice via XSS. Lifetime is sliding (refreshed max-age)
// but capped by an absolute window from sign-in (remember-since stamp);
// once it lapses the session degrades to a browser-session cookie.
export const REMEMBER_COOKIE = "mindy_remember";
export const REMEMBER_SINCE_COOKIE = "mindy_remember_since";
export const REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const REMEMBER_ABSOLUTE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

// Flags shared by every remember-cookie write. Secure only in production
// so plain-HTTP localhost development keeps working.
export function rememberCookieFlags(maxAge: number): {
  maxAge: number;
  path: string;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    maxAge,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
  };
}

// Sliding choice is active only inside the absolute window. A legacy flag
// without a stamp is treated as active once so middleware can stamp it.
export function isRememberActive(
  flag: string | undefined,
  since: string | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (flag !== "1") {
    return false;
  }
  if (since === undefined) {
    return true;
  }
  const sinceMs = Number(since) * 1000;
  if (!Number.isFinite(sinceMs)) {
    return false;
  }
  return nowMs - sinceMs < REMEMBER_ABSOLUTE_MAX_AGE_SECONDS * 1000;
}
