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
