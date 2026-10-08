// API Endpoints
// Single source of truth for internal Route Handler paths. Client hooks
// build URLs from here so renames touch one file.

// Internal Route Handlers (see src/app/api).
export const API_ROUTES = {
  weather: "/api/weather",
  recommender: "/api/recommender",
  analyze: "/api/analyze",
} as const;

/** Builds the weather endpoint URL for device coordinates. */
export function buildWeatherUrl(latitude: number, longitude: number): string {
  return `${API_ROUTES.weather}?lat=${latitude}&lon=${longitude}`;
}

// ---------------------------------------------------------------------------
// Rate limits (in-memory sliding window, see lib/rateLimit.ts)
// ---------------------------------------------------------------------------

/** Per-route quota: key prefix, max requests, and window per user. */
export const RATE_LIMITS = {
  weather: { key: "weather", limit: 30, windowMs: 60 * 60 * 1000 },
  recommender: { key: "recommender", limit: 5, windowMs: 60 * 1000 },
  analyze: { key: "analyze", limit: 30, windowMs: 10 * 60 * 1000 },
} as const;

/** Memory cap for tracked rate-limit keys (oldest evicted first). */
export const RATE_LIMIT_MAX_KEYS = 5000;

/** 429 response header carrying the retry delay in seconds. */
export const RETRY_AFTER_HEADER = "Retry-After";