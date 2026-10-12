import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  // Always prefix (/en/closet, /es/closet) so SSR never guesses: the URL
  // is the source of truth and hydration stays consistent.
  localePrefix: "always",
  // Detect the system/browser language from Accept-Language on the first
  // visit (no NEXT_LOCALE cookie yet). An explicit user choice stored in
  // the cookie always takes precedence over detection.
  localeDetection: true,
  // Device-level persistence: the middleware sets the NEXT_LOCALE cookie
  // on locale-prefixed responses and reads it before Accept-Language.
  // Nothing is stored in Supabase profiles.
  localeCookie: true,
});

export type AppLocale = (typeof routing.locales)[number];
