import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

const checkRateLimit = vi.fn();
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    requestComplete: vi.fn(),
    requestStart: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  isGuardResponse,
  rateLimitResponse,
  readJsonBody,
  requireRouteUser,
} from "./routeGuards";

const rateLimitClient = { rpc: vi.fn() } as never;

describe("routeGuards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requireRouteUser answers 401 without a session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const result = await requireRouteUser("analyze", "req", Date.now());
    expect(isGuardResponse(result)).toBe(true);
    if (isGuardResponse(result)) {
      expect(result.response.status).toBe(401);
    }
  });

  it("requireRouteUser returns the user when signed in", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const result = await requireRouteUser("analyze", "req", Date.now());
    expect(isGuardResponse(result)).toBe(false);
    if (!isGuardResponse(result)) {
      expect(result.user.id).toBe("u1");
    }
  });

  it("rateLimitResponse is null under quota and 429 with Retry-After over it", async () => {
    checkRateLimit.mockReturnValueOnce({ limited: false });
    expect(await rateLimitResponse("weather", "u1", "req", rateLimitClient)).toBeNull();

    checkRateLimit.mockReturnValueOnce({ limited: true, retryAfterSec: 7 });
    const response = await rateLimitResponse("weather", "u1", "req", rateLimitClient);
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("7");
  });

  it("fails closed when the session lookup fails", async () => {
    getUser.mockRejectedValueOnce(new Error("auth unavailable"));
    const result = await requireRouteUser("analyze", "req", Date.now());
    expect(isGuardResponse(result)).toBe(true);
    if (isGuardResponse(result)) {
      expect(result.response.status).toBe(503);
    }
  });

  it("fails closed when the durable limiter is unavailable", async () => {
    checkRateLimit.mockRejectedValueOnce(new Error("database unavailable"));
    const response = await rateLimitResponse(
      "weather",
      "u1",
      "req",
      rateLimitClient,
    );
    expect(response?.status).toBe(503);
  });

  it("readJsonBody parses JSON and answers 400 for invalid JSON", async () => {
    const ok = await readJsonBody(
      new Request("http://x", { method: "POST", body: '{"a":1}' }),
    );
    expect(isGuardResponse(ok)).toBe(false);
    if (!isGuardResponse(ok)) {
      expect(ok.body).toEqual({ a: 1 });
    }

    const bad = await readJsonBody(
      new Request("http://x", { method: "POST", body: "{nope" }),
    );
    expect(isGuardResponse(bad)).toBe(true);
    if (isGuardResponse(bad)) {
      expect(bad.response.status).toBe(400);
    }
  });

  it("rejects an oversized declared body before reading it", async () => {
    const oversized = new Request("http://x", {
      method: "POST",
      headers: { "content-length": "10485761" },
      body: "{}",
    });
    const result = await readJsonBody(oversized);
    expect(isGuardResponse(result)).toBe(true);
    if (isGuardResponse(result)) {
      expect(result.response.status).toBe(413);
    }
  });
});
