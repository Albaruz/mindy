import { NextResponse } from "next/server";
import { getSeasonalFallbackWeather } from "@/constants/weather";
import { logger, generateRequestId } from "@/lib/logger";
import { isRecord, readFiniteNumber, readString } from "@/lib/readers";
import { isGuardResponse, rateLimitResponse, requireRouteUser } from "@/lib/api/routeGuards";

// Standard climate returned whenever coordinates are missing or the
// OpenWeather request fails for any reason (no key, upstream error...).
const OPENWEATHER_TIMEOUT_MS = 8000;
const OPENWEATHER_CACHE_SECONDS = 600;

interface WeatherPayload {
  temperatureC: number;
  condition: string | null;
  city: string | null;
  // Day summary (city-local today): min/max temperature, worst expected
  // condition and max precipitation probability (0-100). Nulls when the
  // forecast request fails: current conditions are still served.
  dayLow: number | null;
  dayHigh: number | null;
  dayCondition: string | null;
  rainProbability: number | null;
  today: WeatherDayPayload;
  tomorrow: WeatherDayPayload | null;
  fallback: boolean;
}

interface WeatherDayPayload {
  temperatureC: number;
  condition: string | null;
  dayLow: number | null;
  dayHigh: number | null;
  dayCondition: string | null;
  rainProbability: number | null;
}

function fallbackResponse(reason: string, requestId: string, userId: string, startTime: number) {
  const durationMs = Date.now() - startTime;
  const fallback = getSeasonalFallbackWeather();
  logger.warn(`Serving default climate: ${reason}`, { route: 'weather', requestId, userId, durationMs, fallback: true });
  const body: WeatherPayload = {
    temperatureC: fallback.temperatureC,
    condition: fallback.condition,
    city: null,
    dayLow: fallback.dayLow,
    dayHigh: fallback.dayHigh,
    dayCondition: fallback.dayCondition,
    rainProbability: fallback.rainProbability,
    today: {
      temperatureC: fallback.temperatureC,
      condition: fallback.condition,
      dayLow: fallback.dayLow,
      dayHigh: fallback.dayHigh,
      dayCondition: fallback.dayCondition,
      rainProbability: fallback.rainProbability,
    },
    tomorrow: null,
    fallback: true,
  };
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

function parseCoordinate(
  value: string | null,
  min: number,
  max: number,
): number | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

// GET /api/weather?lat=40.41&lon=-3.70
export async function GET(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Proxied upstream (OpenWeather quota): require an authenticated
  // session before spending it. All callers live behind the page guard.
  const auth = await requireRouteUser("weather", requestId, startTime);
  if (isGuardResponse(auth)) {
    return auth.response;
  }
  const { user, supabase } = auth;

  // Cheap call, but still third-party quota: cap per user.
  const limited = await rateLimitResponse("weather", user.id, requestId, supabase);
  if (limited !== null) {
    return limited;
  }

  const { searchParams } = new URL(request.url);
  const lat = parseCoordinate(searchParams.get("lat"), -90, 90);
  const lon = parseCoordinate(searchParams.get("lon"), -180, 180);
  if (lat === null || lon === null) {
    return fallbackResponse("missing or invalid coordinates", requestId, user.id, startTime);
  }

  // Server-only key: it never leaves the server through this handler.
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return fallbackResponse("OPENWEATHER_API_KEY is not configured", requestId, user.id, startTime);
  }

  try {
    const fetchStart = Date.now();
    const [currentResult, forecastResult] = await Promise.allSettled([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(apiKey)}`,
        {
          signal: AbortSignal.timeout(OPENWEATHER_TIMEOUT_MS),
          next: { revalidate: OPENWEATHER_CACHE_SECONDS },
        },
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=16&appid=${encodeURIComponent(apiKey)}`,
        {
          signal: AbortSignal.timeout(OPENWEATHER_TIMEOUT_MS),
          next: { revalidate: OPENWEATHER_CACHE_SECONDS },
        },
      ),
    ]);
    const current =
      currentResult.status === "fulfilled" ? currentResult.value : null;
    const forecast =
      forecastResult.status === "fulfilled" ? forecastResult.value : null;
    logger.externalCall(
      "openweather",
      "current+forecast",
      Date.now() - fetchStart,
      current?.ok === true && forecast?.ok === true,
      { route: "weather", requestId, userId: user.id },
    );

    if (current === null) {
      throw currentResult.status === "rejected"
        ? currentResult.reason
        : new Error("OpenWeather current weather response is unavailable.");
    }
    if (!current.ok) {
      return fallbackResponse(`OpenWeather responded ${current.status}`, requestId, user.id, startTime);
    }

    const payload: unknown = await current.json();
    if (typeof payload !== "object" || payload === null) {
      return fallbackResponse("OpenWeather returned an unexpected payload", requestId, user.id, startTime);
    }
    const record = payload as Record<string, unknown>;
    const main =
      typeof record.main === "object" && record.main !== null
        ? (record.main as Record<string, unknown>)
        : null;
    const temperatureC = main ? readFiniteNumber(main.temp) : null;
    if (temperatureC === null) {
      return fallbackResponse("OpenWeather payload has no temperature", requestId, user.id, startTime);
    }

    const weather = Array.isArray(record.weather) ? record.weather : [];
    const first = weather[0];
    const condition =
      isRecord(first)
        ? readString(first.main)
        : null;

    const forecastDays = await readForecastDays(forecast);
    const today: WeatherDayPayload = {
      ...forecastDays.today,
      temperatureC,
      condition,
    };
    const body: WeatherPayload = {
      ...today,
      city: readString(record.name),
      today: {
        temperatureC: today.temperatureC,
        condition: today.condition,
        dayLow: today.dayLow,
        dayHigh: today.dayHigh,
        dayCondition: today.dayCondition,
        rainProbability: today.rainProbability,
      },
      tomorrow: toWeatherDayPayload(forecastDays.tomorrow),
      fallback: false,
    };
    const durationMs = Date.now() - startTime;
    logger.requestComplete('weather', requestId, 200, durationMs, {
      userId: user.id,
      temperatureC,
      condition,
      fallback: false,
    });
    return NextResponse.json(body, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('OpenWeather request failed', { route: 'weather', requestId, userId: user.id, error, durationMs });
    return fallbackResponse("OpenWeather request failed", requestId, user.id, startTime);
  }
}

interface DaySummary {
  temperatureC: number | null;
  condition: string | null;
  dayLow: number | null;
  dayHigh: number | null;
  dayCondition: string | null;
  rainProbability: number | null;
}

const EMPTY_DAY_SUMMARY: DaySummary = {
  temperatureC: null,
  condition: null,
  dayLow: null,
  dayHigh: null,
  dayCondition: null,
  rainProbability: null,
};

// Worst-first ranking: the day condition is the most severe expected.
const CONDITION_SEVERITY = [
  "Thunderstorm",
  "Snow",
  "Rain",
  "Drizzle",
  "Mist",
  "Fog",
  "Haze",
  "Clouds",
  "Clear",
];

function readSlotTemperature(entry: Record<string, unknown>): number | null {
  const main = entry.main;
  if (typeof main !== "object" || main === null) {
    return null;
  }
  return readFiniteNumber((main as Record<string, unknown>).temp);
}

function readSlotCondition(entry: Record<string, unknown>): string | null {
  const weather = Array.isArray(entry.weather) ? entry.weather : [];
  const first = weather[0];
  return isRecord(first)
    ? readString(first.main)
    : null;
}

function readSlotPop(entry: Record<string, unknown>): number | null {
  const pop = entry.pop;
  return typeof pop === "number" && Number.isFinite(pop) ? pop : null;
}

// Day aggregation in city-local time. Today's summary keeps the existing
// late-night fallback; tomorrow is only valid when its own date has slots.
async function readForecastDays(
  forecastResponse: Response | null,
): Promise<{ today: DaySummary; tomorrow: DaySummary | null }> {
  try {
    if (forecastResponse === null || !forecastResponse.ok) {
      return { today: EMPTY_DAY_SUMMARY, tomorrow: null };
    }
    const payload: unknown = await forecastResponse.json();
    if (typeof payload !== "object" || payload === null) {
      return { today: EMPTY_DAY_SUMMARY, tomorrow: null };
    }
    const record = payload as Record<string, unknown>;
    const list = Array.isArray(record.list) ? record.list : [];
    if (list.length === 0) {
      return { today: EMPTY_DAY_SUMMARY, tomorrow: null };
    }
    const city =
      typeof record.city === "object" && record.city !== null
        ? (record.city as Record<string, unknown>)
        : null;
    const timezoneShift =
      city !== null && typeof city.timezone === "number" ? city.timezone : 0;
    const todayKey = Math.floor((Date.now() / 1000 + timezoneShift) / 86400);
    const validEntries = list.filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).dt === "number",
    );
    const todaySlots = validEntries.filter(
      (entry) =>
        Math.floor(
          ((entry.dt as number) + timezoneShift) / 86400,
        ) === todayKey,
    );
    const tomorrowSlots = validEntries.filter(
      (entry) =>
        Math.floor(
          ((entry.dt as number) + timezoneShift) / 86400,
        ) === todayKey + 1,
    );
    // Late at night the remaining day may be empty: look ahead instead.
    const effectiveToday =
      todaySlots.length > 0 ? todaySlots : validEntries.slice(0, 4);

    return {
      today: summarizeDay(effectiveToday),
      tomorrow:
        tomorrowSlots.length > 0 ? summarizeDay(tomorrowSlots) : null,
    };
  } catch {
    return { today: EMPTY_DAY_SUMMARY, tomorrow: null };
  }
}

function summarizeDay(entries: Record<string, unknown>[]): DaySummary {
  let low: number | null = null;
  let high: number | null = null;
  let temperatureTotal = 0;
  let temperatureCount = 0;
  let maxPop = -1;
  let worst: string | null = null;
  let firstCondition: string | null = null;
  for (const entry of entries) {
    const temp = readSlotTemperature(entry);
    if (temp !== null) {
      low = low === null ? temp : Math.min(low, temp);
      high = high === null ? temp : Math.max(high, temp);
      temperatureTotal += temp;
      temperatureCount += 1;
    }
    const pop = readSlotPop(entry);
    if (pop !== null) {
      maxPop = Math.max(maxPop, pop);
    }
    const slotCondition = readSlotCondition(entry);
    firstCondition ??= slotCondition;
    if (
      slotCondition !== null &&
      CONDITION_SEVERITY.includes(slotCondition) &&
      (worst === null ||
        CONDITION_SEVERITY.indexOf(slotCondition) <
          CONDITION_SEVERITY.indexOf(worst))
    ) {
      worst = slotCondition;
    }
  }
  return {
    temperatureC:
      temperatureCount === 0
        ? null
        : Math.round(temperatureTotal / temperatureCount),
    condition: firstCondition,
    dayLow: low === null ? null : Math.round(low),
    dayHigh: high === null ? null : Math.round(high),
    dayCondition: worst,
    rainProbability: maxPop < 0 ? null : Math.round(maxPop * 100),
  };
}

function toWeatherDayPayload(
  summary: DaySummary | null,
): WeatherDayPayload | null {
  if (summary === null || summary.temperatureC === null) {
    return null;
  }
  return {
    temperatureC: summary.temperatureC,
    condition: summary.condition,
    dayLow: summary.dayLow,
    dayHigh: summary.dayHigh,
    dayCondition: summary.dayCondition,
    rainProbability: summary.rainProbability,
  };
}
