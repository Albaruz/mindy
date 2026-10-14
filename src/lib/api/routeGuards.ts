import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { RATE_LIMITS, RETRY_AFTER_HEADER } from "@/constants/api";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";

// Shared guards for the paid / quota-limited Route Handlers
// (analyze, recommender, weather). Each guard returns either its result or
// a ready NextResponse, so handlers stay a flat sequence of early returns.

export type RouteName = keyof typeof RATE_LIMITS;

type Guarded<T> = T | { response: NextResponse };

export function isGuardResponse<T extends object>(
  result: Guarded<T>,
): result is { response: NextResponse } {
  return "response" in result;
}

/** 401 unless a Supabase session exists; logs request start on success. */
export async function requireRouteUser(
  route: RouteName,
  requestId: string,
  startTime: number,
): Promise<Guarded<{ user: User }>> {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    logger.requestComplete(route, requestId, 401, Date.now() - startTime);
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  logger.requestStart(route, requestId, user.id);
  return { user };
}

/** Per-user quota check: a 429 response when exceeded, otherwise null. */
export function rateLimitResponse(
  route: RouteName,
  userId: string,
  requestId: string,
): NextResponse | null {
  const { key, limit, windowMs } = RATE_LIMITS[route];
  const quota = checkRateLimit(`${key}:${userId}`, limit, windowMs);
  if (!quota.limited) {
    return null;
  }
  logger.warn("Rate limit exceeded", {
    route,
    requestId,
    userId,
    retryAfterSec: quota.retryAfterSec,
  });
  return NextResponse.json(
    { error: "Too many requests. Try again later." },
    {
      status: 429,
      headers: { [RETRY_AFTER_HEADER]: String(quota.retryAfterSec) },
    },
  );
}

/** Parses the JSON body; a 400 response when it is not valid JSON. */
export async function readJsonBody(
  request: Request,
): Promise<Guarded<{ body: unknown }>> {
  try {
    return { body: await request.json() };
  } catch {
    return {
      response: NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      ),
    };
  }
}