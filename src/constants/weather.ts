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

// Closed materials that suffer in rain (silk spots and weakens). Suede has
// no closed value: it arrives via extra_tags detail (see
// isRainVulnerableMaterial) and normalizes to leather or null.
export const RAIN_VULNERABLE_MATERIALS = ["silk"] as const;

/** Case-insensitive check against RAINY_CONDITIONS. */
export function isRainyConditionValue(condition: string): boolean {
  return (RAINY_CONDITIONS as readonly string[]).includes(
    condition.toLowerCase(),
  );
}

/**
 * Rain-vulnerable material check (#BKL-001). Closed silk matches directly;
 * suede (incl. Spanish gamuza/ante) is detected in the free-text
 * extra_tags detail, which never reaches the closed material column.
 */
export function isRainVulnerableMaterial(
  material: string | null,
  materialDetail: string | null,
): boolean {
  if (
    material !== null &&
    (RAIN_VULNERABLE_MATERIALS as readonly string[]).includes(
      material.toLowerCase(),
    )
  ) {
    return true;
  }
  if (materialDetail === null) {
    return false;
  }
  const detail = materialDetail.toLowerCase();
  return (
    detail.includes("suede") ||
    detail.includes("gamuza") ||
    detail.includes("ante")
  );
}