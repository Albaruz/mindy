// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockCheckRateLimit, mockGenerate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockGenerate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/ai/engine", () => ({
  generateOutfitRecommendation: mockGenerate,
  getEngineModel: () => "test-model",
}));

import { POST } from "./route";

function buildGarment(id: string, type: string, style = "casual") {
  return {
    garmentId: id,
    garmentType: type,
    color: "black",
    material: "cotton",
    season: "all",
    style,
    isDirty: false,
    extraTags: {},
  };
}

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/recommender", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/recommender", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSec: 0 });
    process.env.GROQ_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns 401 without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(
      buildRequest({ garments: [buildGarment("a", "top")] }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSec: 30 });
    const response = await POST(
      buildRequest({ garments: [buildGarment("a", "top")] }),
    );
    expect(response.status).toBe(429);
  });

  it("returns 400 on empty garments array", async () => {
    const response = await POST(buildRequest({ garments: [] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when no garment has an id", async () => {
    const response = await POST(buildRequest({ garments: [{ foo: 1 }] }));
    expect(response.status).toBe(400);
  });

  it("returns 422 on insufficient style garments", async () => {
    const garments = [buildGarment("a", "top"), buildGarment("b", "bottom")];
    const response = await POST(
      buildRequest({ garments, temperatureC: 20, style: "formal" }),
    );
    expect(response.status).toBe(422);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns 200 with LLM options", async () => {
    const garments = [buildGarment("a", "top"), buildGarment("b", "bottom")];
    mockGenerate.mockResolvedValue(
      JSON.stringify({
        options: [{ garmentIds: ["a", "b"], suitabilityRatio: 85, reason: "Nice" }],
      }),
    );
    const response = await POST(
      buildRequest({ garments, temperatureC: 20 }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.options).toHaveLength(1);
    expect(body._isFallback).toBe(false);
  });

  it("falls back locally on upstream failure", async () => {
    const garments = [buildGarment("a", "top"), buildGarment("b", "bottom")];
    const error = new Error("Groq failed");
    (error as { status?: number }).status = 500;
    mockGenerate.mockRejectedValue(error);
    const response = await POST(
      buildRequest({ garments, temperatureC: 20 }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body._isFallback).toBe(true);
    expect(body.options.length).toBeGreaterThan(0);
  });

  it("returns 500 on unexpected errors", async () => {
    const garments = [buildGarment("a", "top"), buildGarment("b", "bottom")];
    mockGenerate.mockRejectedValue(new Error("unexpected boom"));
    const response = await POST(
      buildRequest({ garments, temperatureC: 20 }),
    );
    expect(response.status).toBe(500);
  });

  it("applies heat rule to exclude winter garments", async () => {
    const garments = [
      { ...buildGarment("a", "top"), season: "winter" },
      buildGarment("b", "top"),
      buildGarment("c", "bottom"),
    ];
    mockGenerate.mockResolvedValue(
      JSON.stringify({
        options: [{ garmentIds: ["b", "c"], suitabilityRatio: 80, reason: "" }],
      }),
    );
    const response = await POST(
      buildRequest({ garments, temperatureC: 30 }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.excludedWinterGarments).toBe(1);
  });
});
