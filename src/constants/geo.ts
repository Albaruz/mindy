// Geolocation
// Single source of truth for device position requests. All callers shared
// two values with a third disagreeing (6s vs 8s timeout); the lenient one
// wins so slow GPS fixes resolve instead of timing out.

/** Position request timeout: slow GPS fixes get 8s. */
export const GEOLOCATION_TIMEOUT_MS = 8000;

/** Cached positions stay valid for 10 minutes. */
export const GEOLOCATION_MAX_AGE_MS = 600_000;