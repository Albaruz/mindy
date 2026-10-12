import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  COOKIE_PATH,
  REMEMBER_COOKIE,
  REMEMBER_MAX_AGE_SECONDS,
  REMEMBER_SINCE_COOKIE,
  isRememberActive,
} from "./cookies";
import {
  SUPABASE_ANON_FALLBACK,
  SUPABASE_URL_FALLBACK,
} from "@/constants/storage";

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
  // Explicit opt-in at sign-in wins (the flag is stamped right after);
  // every other path enforces the absolute window so a stale flag cannot
  // extend persistence forever.
  const remembered =
    options?.persistent ??
    isRememberActive(
      cookieStore.get(REMEMBER_COOKIE)?.value,
      cookieStore.get(REMEMBER_SINCE_COOKIE)?.value,
    );

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_FALLBACK,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_FALLBACK,
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
                  ? { maxAge: REMEMBER_MAX_AGE_SECONDS, path: COOKIE_PATH }
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
