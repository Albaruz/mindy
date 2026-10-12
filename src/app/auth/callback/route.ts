import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hasCompletedOnboarding,
  localizePath,
  postAuthDestination,
} from "@/lib/onboarding";
import { resolveRequestLocale } from "@/lib/serverLocale";

// Auth callback: exchanges the provider/PKCE code for a session.
// Supports ?next=/es/reset-password (recovery links, OAuth) with an
// open-redirect guard; without it, applies the same post-auth destination
// rule as email sign-in (wizard first when the profile is incomplete).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/`);
  }

  const supabase = await createClient();
  try {
    const { data, error } =
      await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/`);
    }
    // Explicit destination wins when it is a safe same-origin path.
    // The login surface lives at `/`, so failures fall back there.
    if (next !== null && next.startsWith("/") && !next.startsWith("//")) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    const completed = await hasCompletedOnboarding(
      supabase,
      data.user.id,
    ).catch(() => true);
    const locale = await resolveRequestLocale();
    return NextResponse.redirect(
      `${origin}${localizePath(postAuthDestination(completed), locale)}`,
    );
  } catch {
    return NextResponse.redirect(`${origin}/`);
  }
}
