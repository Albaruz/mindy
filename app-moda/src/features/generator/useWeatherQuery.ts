import { useQuery } from "@tanstack/react-query";

export const WEATHER_QUERY_KEY = ["weather"] as const;

export interface WeatherInfo {
  temperatureC: number;
  condition: string | null;
  city: string | null;
  // Day summary (city-local today): min/max, worst expected condition.
  dayLow: number | null;
  dayHigh: number | null;
  dayCondition: string | null;
  // Precipitation probability (0-100) for the day, null if unknown.
  rainProbability: number | null;
  fallback: boolean;
}

// Outdoor conditions that call for an outerwear layer.
const RAINY_CONDITIONS = ["Rain", "Drizzle", "Thunderstorm", "Snow"];

export function isRainyCondition(condition: string | null | undefined): boolean {
  return condition !== null && condition !== undefined && RAINY_CONDITIONS.includes(condition);
}

// Imminent rain (forecast probability >= 50%) even when the current
// conditions still look dry: the current-weather endpoint lags reality.
export const RAIN_EXPECTED_THRESHOLD = 50;

export function isRainExpected(rainProbability: number | null | undefined): boolean {
  return (
    typeof rainProbability === "number" &&
    Number.isFinite(rainProbability) &&
    rainProbability >= RAIN_EXPECTED_THRESHOLD
  );
}
const COLD_THRESHOLD_C = 15;

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not available."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 6000,
      maximumAge: 600_000,
    });
  });
}

// Resolves once per page visit (cached 10 min). Null when location is
// unavailable or denied: callers fall back to inventory-based behavior.
async function fetchWeather(): Promise<WeatherInfo | null> {
  try {
    const position = await getCurrentPosition();
    const response = await fetch(
      `/api/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
    );
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return null;
    }
    const record = payload as Record<string, unknown>;
    if (typeof record.temperatureC !== "number") {
      return null;
    }
    return {
      temperatureC: record.temperatureC,
      condition:
        typeof record.condition === "string" ? record.condition : null,
      city: typeof record.city === "string" ? record.city : null,
      dayLow:
        typeof record.dayLow === "number" && Number.isFinite(record.dayLow)
          ? record.dayLow
          : null,
      dayHigh:
        typeof record.dayHigh === "number" && Number.isFinite(record.dayHigh)
          ? record.dayHigh
          : null,
      dayCondition:
        typeof record.dayCondition === "string" ? record.dayCondition : null,
      rainProbability:
        typeof record.rainProbability === "number" &&
        Number.isFinite(record.rainProbability)
          ? Math.min(100, Math.max(0, Math.round(record.rainProbability)))
          : null,
      fallback: record.fallback === true,
    };
  } catch {
    return null;
  }
}

export function useWeatherQuery() {
  return useQuery({
    queryKey: WEATHER_QUERY_KEY,
    queryFn: fetchWeather,
    staleTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Per SDD: outerwear leads the stack only when the weather demands it.
// Without weather data, fall back to showing it when owned.
// Day-based: the day's low and worst expected condition decide, so a cold
// evening or afternoon rain counts even when the morning looks mild.
export function shouldShowOuterwear(
  weather: WeatherInfo | null | undefined,
  ownedCount: number,
): boolean {
  if (!weather || weather.fallback) {
    return ownedCount > 0;
  }
  const coldest = weather.dayLow ?? weather.temperatureC;
  return (
    coldest < COLD_THRESHOLD_C ||
    isRainyCondition(weather.condition) ||
    isRainyCondition(weather.dayCondition) ||
    isRainExpected(weather.rainProbability)
  );
}
