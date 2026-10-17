// One city-local day's weather shared by the weather query, generator and prompts.
export interface WeatherDaySummary {
  temperatureC: number;
  condition: string | null;
  dayLow: number | null;
  dayHigh: number | null;
  dayCondition: string | null;
  // Precipitation probability (0-100) for the day, null if unknown.
  rainProbability: number | null;
}

// Weather snapshot shared by the weather query, generator and prompts.
// The flat fields remain for compatibility with existing consumers and are
// aliases for today's values. The nested values provide an explicit choice
// between today and tomorrow.
export interface WeatherInfo extends WeatherDaySummary {
  city: string | null;
  today?: WeatherDaySummary;
  tomorrow?: WeatherDaySummary | null;
  fallback: boolean;
}
