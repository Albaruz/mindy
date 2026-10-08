// Weather & Climate
// Single source of truth for climate thresholds shared by the server
// routes and the client hooks. Both sides must agree on these values,
// so neither duplicates them locally.

// Standard climate served whenever coordinates are missing or the upstream
// request fails. Client fallbacks mirror this value.
export const DEFAULT_TEMPERATURE_C = 20;

// Above this, winter garments never reach the recommendation engine.
export const HEAT_THRESHOLD_C = 25;

// Below this, outerwear leads the stack.
export const COLD_THRESHOLD_C = 15;

// Outdoor conditions that call for an outerwear layer. Lowercase entries:
// compare case-insensitively (OpenWeather sends "Rain", "Clear", ...).
export const RAINY_CONDITIONS = [
  "rain",
  "drizzle",
  "thunderstorm",
  "snow",
] as const;

// Rain probability (0-100) at or above which rain is expected even when
// current conditions still look dry (the current-weather endpoint lags).
export const RAIN_EXPECTED_THRESHOLD = 50;

/** Case-insensitive check against RAINY_CONDITIONS. */
export function isRainyConditionValue(condition: string): boolean {
  return (RAINY_CONDITIONS as readonly string[]).includes(
    condition.toLowerCase(),
  );
}