// Weather & Climate
// Single source of truth for climate thresholds shared by the server
// routes and the client hooks. Both sides must agree on these values,
// so neither duplicates them locally.

// Annual neutral value for consumers that do not have a weather context.
export const DEFAULT_TEMPERATURE_C = 20;

export interface SeasonalFallbackWeather {
  temperatureC: number;
  condition: string;
  dayLow: number;
  dayHigh: number;
  dayCondition: string;
  rainProbability: number;
}

// Representative national averages for Spain. These are broad defaults for
// missing forecasts, not a location-specific prediction. Seasons follow the
// meteorological calendar: Dec-Feb, Mar-May, Jun-Aug and Sep-Nov.
const SEASONAL_FALLBACK_WEATHER: readonly SeasonalFallbackWeather[] = [
  {
    temperatureC: 10,
    condition: "Clouds",
    dayLow: 5,
    dayHigh: 15,
    dayCondition: "Clouds",
    rainProbability: 35,
  },
  {
    temperatureC: 16,
    condition: "Clear",
    dayLow: 10,
    dayHigh: 22,
    dayCondition: "Clear",
    rainProbability: 30,
  },
  {
    temperatureC: 24,
    condition: "Clear",
    dayLow: 19,
    dayHigh: 31,
    dayCondition: "Clear",
    rainProbability: 10,
  },
  {
    temperatureC: 18,
    condition: "Clouds",
    dayLow: 13,
    dayHigh: 23,
    dayCondition: "Clouds",
    rainProbability: 30,
  },
];

/** Returns the Spain-wide seasonal climate used when live weather is absent. */
export function getSeasonalFallbackWeather(
  date: Date = new Date(),
): SeasonalFallbackWeather {
  const month = date.getMonth();
  const seasonIndex =
    month === 11 || month <= 1
      ? 0
      : month <= 4
        ? 1
        : month <= 7
          ? 2
          : 3;
  return { ...SEASONAL_FALLBACK_WEATHER[seasonIndex] };
}

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
