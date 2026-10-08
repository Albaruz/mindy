import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_PATH,
  REMEMBER_COOKIE,
  REMEMBER_MAX_AGE_SECONDS,
  REMEMBER_SINCE_COOKIE,
  isRememberActive,
  rememberCookieFlags,
} from "./cookies";
import {
  SUPABASE_ANON_FALLBACK,
  SUPABASE_URL_FALLBACK,
} from "@/constants/storage";

// Refreshes an expired session from the session cookies and returns the
// response carrying the updated cookies plus the authenticated user
// (null when there is no valid session). Called from src/proxy.ts.
// Honors the remember-me flag so refreshes keep persistent cookies.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const flag = request.cookies.get(REMEMBER_COOKIE)?.value;
  const since = request.cookies.get(REMEMBER_SINCE_COOKIE)?.value;
  const remembered = isRememberActive(flag, since);
  // Legacy flag without a stamp: stamp now (one fresh 30-day window).
  const stampSince = flag === "1" && since === undefined;
  // Absolute window lapsed: drop the choice so the session degrades to
  // a browser-session cookie instead of sliding forever.
  const expired = flag === "1" && since !== undefined && !remembered;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_FALLBACK,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_FALLBACK,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          if (stampSince) {
            response.cookies.set(
              REMEMBER_SINCE_COOKIE,
              String(Math.floor(Date.now() / 1000)),
              rememberCookieFlags(REMEMBER_MAX_AGE_SECONDS),
            );
          }
          if (expired) {
            response.cookies.delete(REMEMBER_COOKIE);
            response.cookies.delete(REMEMBER_SINCE_COOKIE);
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              ...(remembered
                ? { maxAge: REMEMBER_MAX_AGE_SECONDS, path: COOKIE_PATH }
                : null),
            }),
          );
        },
      },
    },
  );

  // No backend configured (or unreachable): treat as signed out instead
  // of crashing every request.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { response, user, supabase };
  } catch {
    return { response, user: null, supabase };
  }
}
