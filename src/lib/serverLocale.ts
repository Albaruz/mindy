import { cookies, headers } from "next/headers";
import { resolvePreferredLocale } from "@/lib/negotiateLocale";

// Server-side locale for redirects outside [locale] pages (server actions,
// route handlers): explicit NEXT_LOCALE cookie first (user choice), then
// the system/browser language from Accept-Language, then the default.
// Never touches Supabase profiles.
export async function resolveRequestLocale() {
  const cookieStore = await cookies();
  const stored = cookieStore.get("NEXT_LOCALE")?.value;
  let acceptLanguage: string | null = null;
  try {
    acceptLanguage = (await headers()).get("accept-language");
  } catch {
    acceptLanguage = null;
  }
  return resolvePreferredLocale({
    cookieValue: stored,
    acceptLanguage,
  });
}
