import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_COOKIE, REMEMBER_MAX_AGE_SECONDS } from "./cookies";

// Server-side Supabase client for Server Components, Server Actions, and
// Route Handlers. Never import this file (or `next/headers`) into client
// code. Call it per request: `const supabase = await createClient()`.
//
// Pass `persistent: true` on sign-in/sign-up to opt into the 30-day
// "remember me" cookies; the flag cookie keeps middleware refreshes
// persistent too. Reads of the flag cookie are best-effort (route
// handlers without cookie access fall back to session cookies).
export async function createClient(options?: {
  persistent?: boolean;
}) {
  const cookieStore = await cookies();
  const remembered =
    options?.persistent ??
    cookieStore.get(REMEMBER_COOKIE)?.value === "1";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-placeholder",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(remembered
                  ? { maxAge: REMEMBER_MAX_AGE_SECONDS, path: "/" }
                  : null),
              }),
            );
          } catch {
            // Called from a Server Component (read-only cookies).
            // Session refresh is handled by src/proxy.ts instead.
          }
        },
      },
    },
  );
}
