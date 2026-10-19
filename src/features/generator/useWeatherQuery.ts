import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, QUERY_REFETCH_ON_FOCUS, WEATHER_STALE_TIME_MS } from "@/constants/query";
import {
  getSeasonalFallbackWeather,
  COLD_THRESHOLD_C,
  RAIN_EXPECTED_THRESHOLD,
  isRainyConditionValue,
} from "@/constants/weather";
import { getCurrentPosition } from "@/lib/geolocation";
import { buildWeatherUrl } from "@/constants/api";
import type { WeatherDaySummary, WeatherInfo } from "@/types/weather";
import type { OutfitDay } from "./useGeneratorStore";

// Outdoor conditions that call for an outerwear layer.
export function isRainyCondition(condition: string | null | undefined): boolean {
  return (
    condition !== null &&
    condition !== undefined &&
    isRainyConditionValue(condition)
  );
}

// Imminent rain (forecast probability >= 50%) even when the current
// conditions still look dry: the current-weather endpoint lags reality.
export function isRainExpected(rainProbability: number | null | undefined): boolean {
  return (
    typeof rainProbability === "number" &&
    Number.isFinite(rainProbability) &&
    rainProbability >= RAIN_EXPECTED_THRESHOLD
  );
}

export function parseWeatherPayload(payload: unknown): WeatherInfo | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.temperatureC !== "number") {
    return null;
  }

  const readDay = (value: unknown): WeatherDaySummary | null => {
    if (typeof value !== "object" || value === null) {
      return null;
    }
    const day = value as Record<string, unknown>;
    if (
      typeof day.temperatureC !== "number" ||
      !Number.isFinite(day.temperatureC)
    ) {
      return null;
    }
    return {
      temperatureC: day.temperatureC,
      condition: typeof day.condition === "string" ? day.condition : null,
      dayLow:
        typeof day.dayLow === "number" && Number.isFinite(day.dayLow)
          ? day.dayLow
          : null,
      dayHigh:
        typeof day.dayHigh === "number" && Number.isFinite(day.dayHigh)
          ? day.dayHigh
          : null,
      dayCondition:
        typeof day.dayCondition === "string" ? day.dayCondition : null,
      rainProbability:
        typeof day.rainProbability === "number" &&
        Number.isFinite(day.rainProbability)
          ? Math.min(100, Math.max(0, Math.round(day.rainProbability)))
          : null,
    };
  };

  const legacyToday: WeatherDaySummary = {
    temperatureC: record.temperatureC,
    condition: typeof record.condition === "string" ? record.condition : null,
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
  };

  return {
    ...legacyToday,
    city: typeof record.city === "string" ? record.city : null,
    fallback: record.fallback === true,
    ...(record.today !== undefined
      ? { today: readDay(record.today) ?? legacyToday }
      : {}),
    ...(record.tomorrow !== undefined
      ? {
          tomorrow:
            record.tomorrow === null ? null : readDay(record.tomorrow),
        }
      : {}),
  };
}

function clientFallbackWeather(): WeatherInfo {
  const fallback = getSeasonalFallbackWeather();
  return {
    temperatureC: fallback.temperatureC,
    condition: fallback.condition,
    city: null,
    dayLow: fallback.dayLow,
    dayHigh: fallback.dayHigh,
    dayCondition: fallback.dayCondition,
    rainProbability: fallback.rainProbability,
    fallback: true,
  };
}

export function getWeatherForDay(
  weather: WeatherInfo | null | undefined,
  day: OutfitDay,
): WeatherDaySummary | null {
  if (weather === null || weather === undefined || weather.fallback) {
    return null;
  }
  if (day === "tomorrow") {
    return weather.tomorrow ?? null;
  }
  return weather.today ?? {
    temperatureC: weather.temperatureC,
    condition: weather.condition,
    dayLow: weather.dayLow,
    dayHigh: weather.dayHigh,
    dayCondition: weather.dayCondition,
    rainProbability: weather.rainProbability,
  };
}

// Resolves once per page visit (cached 10 min). A local fallback keeps the
// generator usable when location permission, the route, or OpenWeather is
// unavailable; the fallback flag prevents it being presented as a forecast.
async function fetchWeather(): Promise<WeatherInfo | null> {
  try {
    const position = await getCurrentPosition();
    const response = await fetch(
      buildWeatherUrl(position.coords.latitude, position.coords.longitude),
    );
    if (!response.ok) {
      return clientFallbackWeather();
    }
    return parseWeatherPayload(await response.json()) ?? clientFallbackWeather();
  } catch {
    return clientFallbackWeather();
  }
}

export function useWeatherQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.weather,
    queryFn: fetchWeather,
    staleTime: WEATHER_STALE_TIME_MS,
    retry: false,
    refetchOnWindowFocus: QUERY_REFETCH_ON_FOCUS,
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
