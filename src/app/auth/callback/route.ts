import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hasCompletedOnboarding,
  localizePath,
  postAuthDestination,
} from "@/lib/onboarding";
import { resolveRequestLocale } from "@/lib/serverLocale";
import { logger } from "@/lib/logger";

function getTrustedOrigin(requestUrl: URL): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    const siteUrl = new URL(configuredSiteUrl);
    if (
      siteUrl.protocol !== "https:" &&
      !(siteUrl.protocol === "http:" && siteUrl.hostname === "localhost")
    ) {
      throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
    }
    return siteUrl.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }
  return requestUrl.origin;
}

function resolveSafeNext(next: string | null, origin: string): URL | null {
  if (
    next === null ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(next)
  ) {
    return null;
  }

  try {
    const destination = new URL(next, origin);
    return destination.origin === origin ? destination : null;
  } catch {
    return null;
  }
}

// Auth callback: exchanges the provider/PKCE code for a session.
// Supports ?next=/es/reset-password (recovery links, OAuth) with an
// open-redirect guard; without it, applies the same post-auth destination
// rule as email sign-in (wizard first when the profile is incomplete).
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = getTrustedOrigin(requestUrl);
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
      logger.warn("Auth callback code exchange failed", {
        route: "auth-callback",
        error,
      });
      return NextResponse.redirect(`${origin}/`);
    }
    // Explicit recovery destinations win only when they remain same-origin.
    const destination = resolveSafeNext(next, origin);
    if (destination !== null) {
      return NextResponse.redirect(destination);
    }
    const completed = await hasCompletedOnboarding(
      supabase,
      data.user.id,
    ).catch(() => false);
    const locale = await resolveRequestLocale();
    return NextResponse.redirect(
      `${origin}${localizePath(postAuthDestination(completed), locale)}`,
    );
  } catch (error) {
    logger.error("Auth callback failed", { route: "auth-callback", error });
    return NextResponse.redirect(`${origin}/`);
  }
}
