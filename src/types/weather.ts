// Weather snapshot shared by the weather query, generator and prompts.
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