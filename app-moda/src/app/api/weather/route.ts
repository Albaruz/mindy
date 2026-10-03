import { NextResponse } from "next/server";

// Standard climate returned whenever coordinates are missing or the
// OpenWeather request fails for any reason (no key, upstream error...).
const DEFAULT_TEMPERATURE_C = 20;
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
  fallback: boolean;
}

function fallbackResponse(reason: string) {
  console.warn(`[weather] serving default climate: ${reason}`);
  const body: WeatherPayload = {
    temperatureC: DEFAULT_TEMPERATURE_C,
    condition: null,
    city: null,
    dayLow: null,
    dayHigh: null,
    dayCondition: null,
    rainProbability: null,
    fallback: true,
  };
  return NextResponse.json(body);
}

function parseCoordinate(
  value: string | null,
  min: number,
  max: number,
): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function readTemperature(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// GET /api/weather?lat=40.41&lon=-3.70
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseCoordinate(searchParams.get("lat"), -90, 90);
  const lon = parseCoordinate(searchParams.get("lon"), -180, 180);
  if (lat === null || lon === null) {
    return fallbackResponse("missing or invalid coordinates");
  }

  // Server-only key: it never leaves the server through this handler.
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return fallbackResponse("OPENWEATHER_API_KEY is not configured");
  }

  try {
    const [current, forecast] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(apiKey)}`,
        {
          signal: AbortSignal.timeout(OPENWEATHER_TIMEOUT_MS),
          next: { revalidate: OPENWEATHER_CACHE_SECONDS },
        },
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=8&appid=${encodeURIComponent(apiKey)}`,
        {
          signal: AbortSignal.timeout(OPENWEATHER_TIMEOUT_MS),
          next: { revalidate: OPENWEATHER_CACHE_SECONDS },
        },
      ),
    ]);
    const upstream = current;
    if (!upstream.ok) {
      return fallbackResponse(`OpenWeather responded ${upstream.status}`);
    }

    const payload: unknown = await upstream.json();
    if (typeof payload !== "object" || payload === null) {
      return fallbackResponse("OpenWeather returned an unexpected payload");
    }
    const record = payload as Record<string, unknown>;
    const main =
      typeof record.main === "object" && record.main !== null
        ? (record.main as Record<string, unknown>)
        : null;
    const temperatureC = main ? readTemperature(main.temp) : null;
    if (temperatureC === null) {
      return fallbackResponse("OpenWeather payload has no temperature");
    }

    const weather = Array.isArray(record.weather) ? record.weather : [];
    const first = weather[0];
    const condition =
      typeof first === "object" && first !== null
        ? readString((first as Record<string, unknown>).main)
        : null;

    const body: WeatherPayload = {
      temperatureC,
      condition,
      city: readString(record.name),
      ...(await readDaySummary(forecast)),
      fallback: false,
    };
    return NextResponse.json(body);
  } catch {
    return fallbackResponse("OpenWeather request failed");
  }
}

interface DaySummary {
  dayLow: number | null;
  dayHigh: number | null;
  dayCondition: string | null;
  rainProbability: number | null;
}

const EMPTY_DAY_SUMMARY: DaySummary = {
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
  return readTemperature((main as Record<string, unknown>).temp);
}

function readSlotCondition(entry: Record<string, unknown>): string | null {
  const weather = Array.isArray(entry.weather) ? entry.weather : [];
  const first = weather[0];
  return typeof first === "object" && first !== null
    ? readString((first as Record<string, unknown>).main)
    : null;
}

function readSlotPop(entry: Record<string, unknown>): number | null {
  const pop = entry.pop;
  return typeof pop === "number" && Number.isFinite(pop) ? pop : null;
}

// Day aggregation in city-local time: slots sharing today's local date.
// Falls back to the next slots when none remain today (late-night edge).
// A failed forecast never blocks current conditions: returns nulls.
async function readDaySummary(
  forecastResponse: Response,
): Promise<DaySummary> {
  try {
    if (!forecastResponse.ok) {
      return EMPTY_DAY_SUMMARY;
    }
    const payload: unknown = await forecastResponse.json();
    if (typeof payload !== "object" || payload === null) {
      return EMPTY_DAY_SUMMARY;
    }
    const record = payload as Record<string, unknown>;
    const list = Array.isArray(record.list) ? record.list : [];
    if (list.length === 0) {
      return EMPTY_DAY_SUMMARY;
    }
    const city =
      typeof record.city === "object" && record.city !== null
        ? (record.city as Record<string, unknown>)
        : null;
    const timezoneShift =
      city !== null && typeof city.timezone === "number" ? city.timezone : 0;
    const todayKey = Math.floor((Date.now() / 1000 + timezoneShift) / 86400);
    const slots = list.filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).dt === "number" &&
        Math.floor(
          (((entry as Record<string, unknown>).dt as number) +
            timezoneShift) /
            86400,
        ) === todayKey,
    );
    // Late at night the remaining day may be empty: look ahead instead.
    const effective =
      slots.length > 0
        ? slots
        : list
            .filter(
              (entry): entry is Record<string, unknown> =>
                typeof entry === "object" && entry !== null,
            )
            .slice(0, 4);

    let low: number | null = null;
    let high: number | null = null;
    let maxPop = -1;
    let worst: string | null = null;
    for (const entry of effective) {
      const temp = readSlotTemperature(entry);
      if (temp !== null) {
        low = low === null ? temp : Math.min(low, temp);
        high = high === null ? temp : Math.max(high, temp);
      }
      const pop = readSlotPop(entry);
      if (pop !== null) {
        maxPop = Math.max(maxPop, pop);
      }
      const slotCondition = readSlotCondition(entry);
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
      dayLow: low === null ? null : Math.round(low),
      dayHigh: high === null ? null : Math.round(high),
      dayCondition: worst,
      rainProbability: maxPop < 0 ? null : Math.round(maxPop * 100),
    };
  } catch {
    return EMPTY_DAY_SUMMARY;
  }
}
