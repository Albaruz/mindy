import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  MAX_JSON_BODY_BYTES,
  RATE_LIMITS,
  RETRY_AFTER_HEADER,
} from "@/constants/api";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";

// Shared guards for the paid / quota-limited Route Handlers
// (analyze, recommender, weather). Each guard returns either its result or
// a ready NextResponse, so handlers stay a flat sequence of early returns.

export type RouteName = keyof typeof RATE_LIMITS;

type Guarded<T> = T | { response: NextResponse };
type RouteSupabaseClient = SupabaseClient;

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
): Promise<Guarded<{ user: User; supabase: RouteSupabaseClient }>> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let user: User | null;
  try {
    supabase = await createClient();
    user = await getSessionUser(supabase);
  } catch (error) {
    logger.error("Route authentication lookup failed", {
      route,
      requestId,
      error,
    });
    logger.requestComplete(route, requestId, 503, Date.now() - startTime);
    return {
      response: NextResponse.json(
        { error: "Authentication service unavailable." },
        { status: 503 },
      ),
    };
  }
  if (!user) {
    logger.requestComplete(route, requestId, 401, Date.now() - startTime);
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  logger.requestStart(route, requestId, user.id);
  return { user, supabase };
}

/** Per-user quota check: a 429 response when exceeded, otherwise null. */
export async function rateLimitResponse(
  route: RouteName,
  userId: string,
  requestId: string,
  supabase: RouteSupabaseClient,
): Promise<NextResponse | null> {
  const { key } = RATE_LIMITS[route];
  let quota;
  try {
    quota = await checkRateLimit(supabase, key);
  } catch (error) {
    logger.error("Rate limit service unavailable", {
      route,
      requestId,
      userId,
      error,
    });
    return NextResponse.json(
      { error: "Request protection service unavailable." },
      { status: 503 },
    );
  }
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
    const declaredLength = request.headers.get("content-length");
    if (
      declaredLength !== null &&
      (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_JSON_BODY_BYTES)
    ) {
      return {
        response: NextResponse.json(
          { error: "Request body is too large." },
          { status: 413 },
        ),
      };
    }

    if (request.body === null) {
      return {
        response: NextResponse.json(
          { error: "Request body must be valid JSON." },
          { status: 400 },
        ),
      };
    }

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        return {
          response: NextResponse.json(
            { error: "Request body is too large." },
            { status: 413 },
          ),
        };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { body: JSON.parse(text) as unknown };
  } catch {
    return {
      response: NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      ),
    };
  }
}

/** Parses JSON and rejects arrays, null, and primitive values. */
export async function readJsonObject(
  request: Request,
): Promise<Guarded<{ body: Record<string, unknown> }>> {
  const parsed = await readJsonBody(request);
  if (isGuardResponse(parsed)) {
    return parsed;
  }
  if (
    typeof parsed.body !== "object" ||
    parsed.body === null ||
    Array.isArray(parsed.body)
  ) {
    return {
      response: NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 },
      ),
    };
  }
  return { body: parsed.body as Record<string, unknown> };
}
