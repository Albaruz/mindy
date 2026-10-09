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

import { POST } from "./route";

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSec: 0 });
  });

  it("returns 401 without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSec: 30 });
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(429);
  });

  it("returns 503 without api key", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const previous = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    try {
      const response = await POST(buildRequest({}));
      expect(response.status).toBe(503);
    } finally {
      if (previous !== undefined) process.env.GROQ_API_KEY = previous;
    }
  });

  it("returns 400 on invalid image payload", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    process.env.GROQ_API_KEY = "test-key";
    const response = await POST(buildRequest({ imageBase64: "invalid" }));
    expect(response.status).toBe(400);
    delete process.env.GROQ_API_KEY;
  });
});
