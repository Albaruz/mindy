import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { resolvePreferredLocale } from "@/lib/negotiateLocale";

// Root safety net: the intl middleware normally redirects "/" to the
// negotiated locale before this renders. If it is ever bypassed (cached
// or static hosting), resolve the same way: explicit cookie first, then
// the system/browser language from Accept-Language.
export default async function RootPage() {
  const cookieStore = await cookies();
  let acceptLanguage: string | null = null;
  try {
    acceptLanguage = (await headers()).get("accept-language");
  } catch {
    acceptLanguage = null;
  }
  const locale = resolvePreferredLocale({
    cookieValue: cookieStore.get("NEXT_LOCALE")?.value,
    acceptLanguage,
  });
  redirect(`/${locale}`);
}
