// Minimal in-memory sliding-window rate limiter for Route Handlers.
// Per-instance memory: sufficient as a first barrier on single-instance
// deployments; move to Redis (Upstash) when running multiple instances,
// since buckets do not sync across them.
import { RATE_LIMIT_MAX_KEYS } from "@/constants/api";

const buckets = new Map<string, number[]>();

interface RateLimitResult {
  limited: boolean;
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );
  if (hits.length >= limit) {
    const oldest = hits[0] ?? windowStart;
    return {
      limited: true,
      retryAfterSec: Math.max(
        1,
        Math.ceil((oldest + windowMs - now) / 1000),
      ),
    };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > RATE_LIMIT_MAX_KEYS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey !== undefined) {
      buckets.delete(oldestKey);
    }
  }
  return { limited: false, retryAfterSec: 0 };
}
