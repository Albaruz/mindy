// "Remember me" plumbing: Supabase SSR auth cookies are session-scoped
// by default (forgotten when the browser closes). A persistent opt-in is
// tracked with the flag cookie below; auth cookies then carry a 30-day
// max-age on sign-in and on every middleware refresh.
export const REMEMBER_COOKIE = "mindy_remember";
export const REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
