import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, REMEMBER_MAX_AGE_SECONDS } from "./cookies";

// Refreshes an expired session from the session cookies and returns the
// response carrying the updated cookies plus the authenticated user
// (null when there is no valid session). Called from src/proxy.ts.
// Honors the remember-me flag so refreshes keep persistent cookies.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const remembered = request.cookies.get(REMEMBER_COOKIE)?.value === "1";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-placeholder",
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              ...(remembered
                ? { maxAge: REMEMBER_MAX_AGE_SECONDS, path: "/" }
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
