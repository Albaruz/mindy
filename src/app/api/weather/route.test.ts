// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockCheckRateLimit } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

import { GET } from "./route";

function buildRequest(url: string): Request {
  return new Request(url);
}

describe("GET /api/weather", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSec: 0 });
  });

  it("returns 401 without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await GET(buildRequest("http://localhost/api/weather?lat=40&lon=-3"));
    expect(response.status).toBe(401);
  });

  it("serves fallback on invalid coordinates", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const response = await GET(buildRequest("http://localhost/api/weather"));
    const body = await response.json();
    expect(body.fallback).toBe(true);
    expect(body.temperatureC).toBe(20);
  });

  it("serves fallback when rate limited", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSec: 60 });
    const response = await GET(
      buildRequest("http://localhost/api/weather?lat=40&lon=-3"),
    );
    const body = await response.json();
    expect(body.fallback).toBe(true);
  });

  it("serves fallback without api key", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const previous = process.env.OPENWEATHER_API_KEY;
    delete process.env.OPENWEATHER_API_KEY;
    try {
      const response = await GET(
        buildRequest("http://localhost/api/weather?lat=40&lon=-3"),
      );
      const body = await response.json();
      expect(body.fallback).toBe(true);
    } finally {
      if (previous !== undefined) process.env.OPENWEATHER_API_KEY = previous;
    }
  });
});

describe("GET /api/weather extended coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSec: 0 });
    process.env.OPENWEATHER_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  function todayDt(offsetSec: number, timezone = 0): number {
    const todayKey = Math.floor((Date.now() / 1000 + timezone) / 86400);
    return todayKey * 86400 - timezone + 3600 + offsetSec;
  }

  function slot(
    dt: number,
    temp: number | null,
    condition: string | null,
    pop?: number | null,
  ) {
    const entry: Record<string, unknown> = { dt };
    entry.main = temp === null ? {} : { temp };
    entry.weather =
      condition === null ? [] : [{ main: condition }];
    if (pop !== undefined && pop !== null) entry.pop = pop;
    if (pop === null) entry.pop = "bad";
    return entry;
  }

  function stubFetch(current: unknown, forecast: unknown, forecastOk = true) {
    const currentResponse = new Response(JSON.stringify(current), {
      status: 200,
    });
    const forecastResponse = new Response(JSON.stringify(forecast), {
      status: forecastOk ? 200 : 500,
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/forecast?")) return forecastResponse;
      return currentResponse;
    }));
  }

  it("serves current weather with aggregated day summary", async () => {
    const dt = todayDt(0);
    stubFetch(
      {
        main: { temp: 21.4 },
        weather: [{ main: "Clear" }],
        name: "Madrid",
      },
      {
        list: [
          slot(dt, 10.2, "Clear", 0.5),
          slot(dt + 3600, 15.7, "Rain", 0.8),
          slot(dt + 7200, 12.3, "Clouds", 0.1),
          slot(dt + 86400, 16.2, "Clear", 0.2),
          slot(dt + 90000, 20.8, "Clouds", 0.4),
        ],
        city: { timezone: 0 },
      },
    );
    const { GET: handler } = await import("./route");
    const response = await handler(
      buildRequest("http://localhost/api/weather?lat=40&lon=-3"),
    );
    const body = await response.json();
    expect(body.fallback).toBe(false);
    expect(body.temperatureC).toBe(21.4);
    expect(body.condition).toBe("Clear");
    expect(body.city).toBe("Madrid");
    expect(body.dayLow).toBe(10);
    expect(body.dayHigh).toBe(16);
    expect(body.dayCondition).toBe("Rain");
    expect(body.rainProbability).toBe(80);
    expect(body.today.temperatureC).toBe(21.4);
    expect(body.today.dayLow).toBe(10);
    expect(body.tomorrow.temperatureC).toBe(19);
    expect(body.tomorrow.dayLow).toBe(16);
    expect(body.tomorrow.dayHigh).toBe(21);
    expect(body.tomorrow.rainProbability).toBe(40);
  });

  it("falls back to next slots late at night", async () => {
    const todayKey = Math.floor(Date.now() / 1000 / 86400);
    const far = (todayKey + 3) * 86400;
    stubFetch(
      { main: { temp: 20 }, weather: [{ main: "Clear" }], name: "X" },
      {
        list: [
          slot(far, 11.1, "Clear", 0.2),
          slot(far + 3600, 13.9, "Clear", 0.3),
          slot(far + 7200, 12.0, "Clear", 0),
          slot(far + 10800, 14.0, "Clear", 0),
          slot(far + 14400, 19.0, "Clear", 0),
        ],
        city: { timezone: 0 },
      },
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.dayLow).toBe(11);
    expect(body.dayHigh).toBe(14);
  });

  it("returns null day summary when forecast is not ok", async () => {
    stubFetch(
      { main: { temp: 20 }, weather: [{ main: "Clear" }], name: "X" },
      { list: [] },
      false,
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.dayLow).toBeNull();
    expect(body.dayHigh).toBeNull();
    expect(body.dayCondition).toBeNull();
    expect(body.rainProbability).toBeNull();
  });

  it("returns null day summary on invalid forecast payload", async () => {
    const currentResponse = new Response(
      JSON.stringify({ main: { temp: 20 }, weather: [], name: null }),
      { status: 200 },
    );
    const forecastResponse = new Response("42", { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("/forecast?")
          ? forecastResponse
          : currentResponse,
      ),
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.condition).toBeNull();
    expect(body.city).toBeNull();
    expect(body.dayLow).toBeNull();
  });

  it("serves fallback when current response is not ok", async () => {
    const bad = new Response("error", { status: 500 });
    const good = new Response(JSON.stringify({ list: [] }), { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("/forecast?") ? good : bad,
      ),
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(true);
  });

  it("serves fallback when temperature is missing or malformed", async () => {
    stubFetch(
      { main: { temp: "hot" }, weather: [{ main: "Clear" }] },
      { list: [] },
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(true);
    expect(body.temperatureC).toBe(20);
  });

  it("serves fallback on out-of-range or non-numeric coordinates", async () => {
    const { GET: handler } = await import("./route");
    for (const url of [
      "http://localhost/api/weather?lat=91&lon=-3",
      "http://localhost/api/weather?lat=40&lon=abc",
      "http://localhost/api/weather?lat=-91&lon=0",
      "http://localhost/api/weather?lat=40&lon=181",
    ]) {
      const body = await (await handler(buildRequest(url))).json();
      expect(body.fallback).toBe(true);
    }
  });

  it("serves fallback when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(true);
  });

  it("serves fallback on non-object current payload", async () => {
    const currentResponse = new Response("null", { status: 200 });
    const forecastResponse = new Response(JSON.stringify({ list: [] }), {
      status: 200,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("/forecast?")
          ? forecastResponse
          : currentResponse,
      ),
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(true);
  });

  it("tolerates degenerate forecast slots", async () => {
    const dt = todayDt(0);
    stubFetch(
      { main: { temp: 20 }, weather: [{ main: "Clear" }], name: "X" },
      {
        list: [
          { dt, main: null, weather: [{ main: "Hailstorm" }], pop: "bad" },
          { dt: dt + 60, main: { temp: 14.4 }, weather: "bad", pop: 0.4 },
          { dt: dt + 120, main: { temp: 16.6 }, weather: [42], pop: 0.9 },
          "not-an-entry",
          { main: { temp: 99 } },
        ],
        city: { timezone: "bad" },
      },
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.dayLow).toBe(14);
    expect(body.dayHigh).toBe(17);
    expect(body.rainProbability).toBe(90);
    expect(body.dayCondition).toBeNull();
  });
});

describe("GET /api/weather residual coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSec: 0 });
    process.env.OPENWEATHER_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  function stubFetch(current: unknown, forecast: unknown) {
    const currentResponse = new Response(JSON.stringify(current), {
      status: 200,
    });
    const forecastResponse = new Response(
      typeof forecast === "string" ? forecast : JSON.stringify(forecast),
      { status: 200 },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("/forecast?")
          ? forecastResponse
          : currentResponse,
      ),
    );
  }

  function todayDt(offsetSec: number): number {
    const todayKey = Math.floor(Date.now() / 1000 / 86400);
    return todayKey * 86400 + 3600 + offsetSec;
  }

  it("serves fallback when main block is missing", async () => {
    stubFetch({ main: 42, weather: [], name: "X" }, { list: [] });
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(true);
  });

  it("tolerates a non-object weather entry", async () => {
    const dt = todayDt(0);
    stubFetch(
      { main: { temp: 20 }, weather: [42], name: "X" },
      {
        list: [{ dt, main: { temp: 15.2 }, weather: [{ main: "Clear" }] }],
        city: { timezone: 0 },
      },
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.condition).toBeNull();
    expect(body.dayLow).toBe(15);
  });

  it("returns null day summary when the forecast has no list", async () => {
    stubFetch(
      { main: { temp: 20 }, weather: [{ main: "Clear" }], name: "X" },
      { city: { timezone: 0 } },
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.dayLow).toBeNull();
    expect(body.rainProbability).toBeNull();
  });

  it("aggregates without city metadata", async () => {
    const dt = todayDt(0);
    stubFetch(
      { main: { temp: 20 }, weather: [{ main: "Clear" }], name: "X" },
      {
        list: [
          { dt, main: { temp: 10.6 }, weather: [{ main: "Clouds" }] },
          { dt: dt + 3600, main: { temp: 18.4 }, weather: [{ main: "Clear" }] },
        ],
      },
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.dayLow).toBe(11);
    expect(body.dayHigh).toBe(18);
  });

  it("returns null day summary when forecast JSON is malformed", async () => {
    stubFetch(
      { main: { temp: 20 }, weather: [{ main: "Clear" }], name: "X" },
      "not json {{",
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.dayLow).toBeNull();
    expect(body.dayHigh).toBeNull();
    expect(body.dayCondition).toBeNull();
    expect(body.rainProbability).toBeNull();
  });

  it("returns null aggregates when slots carry no usable data", async () => {
    const dt = todayDt(0);
    stubFetch(
      { main: { temp: 20 }, weather: [{ main: "Clear" }], name: "X" },
      {
        list: [
          { dt, main: null, weather: [{ main: "Hailstorm" }] },
          { dt: dt + 60, main: {}, weather: [] },
        ],
        city: { timezone: 0 },
      },
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.dayLow).toBeNull();
    expect(body.dayHigh).toBeNull();
    expect(body.dayCondition).toBeNull();
    expect(body.rainProbability).toBeNull();
  });

  it("tolerates a non-array weather block", async () => {
    const dt = todayDt(0);
    stubFetch(
      { main: { temp: 19.5 }, weather: "bad", name: "X" },
      {
        list: [{ dt, main: { temp: 15.2 }, weather: [{ main: "Clear" }] }],
        city: { timezone: 0 },
      },
    );
    const { GET: handler } = await import("./route");
    const body = await (
      await handler(buildRequest("http://localhost/api/weather?lat=40&lon=-3"))
    ).json();
    expect(body.fallback).toBe(false);
    expect(body.condition).toBeNull();
    expect(body.dayLow).toBe(15);
  });
});
