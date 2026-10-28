import { getSeasonalFallbackWeather } from "@/constants/weather";
import type { WeatherDaySummary, WeatherInfo } from "@/types/weather";
import type { OutfitDay } from "../../state/generator-store/useGeneratorStore";

export type RecommenderClimate = Pick<
  WeatherInfo,
  "temperatureC" | "condition" | "dayLow" | "dayHigh" | "rainProbability"
>;

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

export function getDefaultClimate(): RecommenderClimate {
  const fallback = getSeasonalFallbackWeather();
  return {
    temperatureC: fallback.temperatureC,
    condition: fallback.condition,
    dayLow: fallback.dayLow,
    dayHigh: fallback.dayHigh,
    rainProbability: fallback.rainProbability,
  };
}

/** Use cached weather for generation; fall back immediately instead of
 * repeating geolocation or creating another weather request. */
export function resolveCachedClimate(
  weather: WeatherInfo | null | undefined,
  outfitDay: OutfitDay,
): RecommenderClimate {
  const selectedWeather = getWeatherForDay(weather, outfitDay);
  if (selectedWeather === null) {
    return getDefaultClimate();
  }
  return {
    temperatureC: selectedWeather.temperatureC,
    condition: selectedWeather.condition,
    dayLow: selectedWeather.dayLow,
    dayHigh: selectedWeather.dayHigh,
    rainProbability: selectedWeather.rainProbability,
  };
}
