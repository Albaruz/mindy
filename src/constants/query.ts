// TanStack Query Keys
// Single source of truth for server-state cache keys. Mutations invalidate
// through these, so renames touch one file instead of every feature hook.

export const QUERY_KEYS = {
  garments: ["garments"],
  profile: ["profile"],
  laundryBasket: ["laundry-basket"],
  history: ["outfit-history"],
  weather: ["weather"],
} as const;

export type QueryKeyName = keyof typeof QUERY_KEYS;

// ---------------------------------------------------------------------------
// Query defaults (TanStack Query)
// ---------------------------------------------------------------------------

/** Global cache freshness for server state. */
export const QUERY_STALE_TIME_MS = 30_000;

/** Global retry count for failed queries. */
export const QUERY_RETRY_COUNT = 1;

/** Freshness / cache lifetime of entity queries (closet, profile, history, laundry): they change only on explicit user actions. */
export const ENTITY_STALE_TIME_MS = 5 * 60 * 1000;
export const ENTITY_GC_TIME_MS = 10 * 60 * 1000;

/** Never refetch on window focus: mobile PWA with manual refresh. */
export const QUERY_REFETCH_ON_FOCUS = false;

/** Serve persisted cache while offline instead of wiping on failure. */
export const QUERY_NETWORK_MODE = "offlineFirst" as const;

/** IndexedDB persist TTL for the query cache. */
export const QUERY_PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Weather cache freshness (resolves once per visit, cached 10 min). */
export const WEATHER_STALE_TIME_MS = 10 * 60 * 1000;