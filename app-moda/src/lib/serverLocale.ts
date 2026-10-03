import { cookies } from "next/headers";
import { routing, type AppLocale } from "@/i18n/routing";

// Server-side locale for redirects outside [locale] pages (server actions,
// route handlers): NEXT_LOCALE cookie set by the intl middleware, falling
// back to the configured default. Never touches Supabase profiles.
export async function resolveRequestLocale(): Promise<AppLocale> {
  const stored = (await cookies()).get("NEXT_LOCALE")?.value;
  return routing.locales.includes(stored as AppLocale)
    ? (stored as AppLocale)
    : routing.defaultLocale;
}
