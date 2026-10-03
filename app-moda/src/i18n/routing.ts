import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  // Always prefix (/en/closet, /es/closet) so SSR never guesses: the URL
  // is the source of truth and hydration stays consistent.
  localePrefix: "always",
  // Device-level persistence: the middleware sets the NEXT_LOCALE cookie
  // on locale-prefixed responses and reads it before Accept-Language.
  // Nothing is stored in Supabase profiles.
  localeCookie: true,
});

export type AppLocale = (typeof routing.locales)[number];
