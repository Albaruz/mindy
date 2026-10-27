// API Endpoints
// Single source of truth for internal Route Handler paths. Client hooks
// build URLs from here so renames touch one file.

// Internal Route Handlers (see src/app/api).
export const API_ROUTES = {
  weather: "/api/weather",
  recommender: "/api/recommender",
  analyze: "/api/analyze",
  favorites: "/api/favorites",
  garments: "/api/garments",
} as const;

/** Builds the weather endpoint URL for device coordinates. */
export function buildWeatherUrl(latitude: number, longitude: number): string {
  return `${API_ROUTES.weather}?lat=${latitude}&lon=${longitude}`;
}

export function buildGarmentFavoriteUrl(garmentId: string): string {
  return `${API_ROUTES.garments}/${encodeURIComponent(garmentId)}/favorite`;
}

// ---------------------------------------------------------------------------
// Per-user quotas enforced atomically by the Supabase consume_api_rate_limit RPC.
// Keep limits aligned with the server-owned values in its database migration;
// only the route key is sent to Postgres by the caller.
// ---------------------------------------------------------------------------

/** Per-route quota reference: key, maximum requests, and fixed window per user. */
export const RATE_LIMITS = {
  weather: { key: "weather", limit: 30, windowMs: 60 * 60 * 1000 },
  recommender: { key: "recommender", limit: 5, windowMs: 60 * 1000 },
  analyze: { key: "analyze", limit: 30, windowMs: 10 * 60 * 1000 },
  favorite: { key: "favorite", limit: 60, windowMs: 60 * 1000 },
} as const;

/** 429 response header carrying the retry delay in seconds. */
export const RETRY_AFTER_HEADER = "Retry-After";

/** Maximum UTF-8 bytes accepted by JSON Route Handler bodies. */
export const MAX_JSON_BODY_BYTES = 10 * 1024 * 1024;
