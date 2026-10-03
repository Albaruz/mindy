import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { updateSession } from "@/lib/supabase/middleware";
import {
  hasCompletedOnboarding,
  localizePath,
  postAuthDestination,
} from "@/lib/onboarding";
import { routing, type AppLocale } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

function isLocaleResponse(response: Response): boolean {
  // next-intl answers locale negotiation with a redirect or rewrite;
  // a plain pass-through is a 200 without location headers.
  return (
    response.status >= 300 ||
    response.headers.has("location") ||
    response.headers.has("x-middleware-rewrite")
  );
}

function stripLocale(pathname: string): {
  locale: AppLocale;
  pathname: string;
} {
  const segments = pathname.split("/");
  const candidate = segments[1];
  if (
    candidate === "en" ||
    candidate === "es" ||
    routing.locales.includes(candidate as AppLocale)
  ) {
    return {
      locale: candidate as AppLocale,
      pathname: `/${segments.slice(2).join("/")}`,
    };
  }
  return { locale: routing.defaultLocale, pathname };
}

// Composed proxy: locale negotiation first (Accept-Language default,
// NEXT_LOCALE cookie persistence), then the Supabase session refresh and
// the auth/onboarding guards on locale-aware paths. API and OAuth routes
// stay locale-free and are guarded as before.
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/") && !pathname.startsWith("/auth/")) {
    const intlResponse = await intlMiddleware(request);
    if (isLocaleResponse(intlResponse)) {
      return intlResponse;
    }
  }

  const { response, user, supabase } = await updateSession(request);
  const { locale, pathname: unprefixed } = stripLocale(pathname);

  // API routes speak JSON, never redirects: guards apply to pages only.
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // The OAuth callback carries no session yet: the code exchange inside
  // the route creates it. Never bounce it to the auth gate.
  // Recovery and reset pages are guest flows too: the email link lands
  // with a code that only becomes a session once the page renders.
  const isGuestAllowed =
    unprefixed === "/" ||
    unprefixed === "/forgot-password" ||
    unprefixed === "/reset-password" ||
    pathname === "/auth/callback";
  if (!user && !isGuestAllowed) {
    const url = request.nextUrl.clone();
    url.pathname = localizePath("/", locale);
    return NextResponse.redirect(url);
  }

  if (user && unprefixed === "/") {
    const completed = await hasCompletedOnboarding(supabase, user.id).catch(
      () => false,
    );
    const url = request.nextUrl.clone();
    url.pathname = localizePath(postAuthDestination(completed), locale);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
