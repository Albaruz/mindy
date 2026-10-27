// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireRouteUser,
  mockRateLimitResponse,
  mockUpdate,
  mockIdFilter,
  mockUserFilter,
  mockSelect,
  mockMaybeSingle,
  mockFrom,
} = vi.hoisted(() => ({
  mockRequireRouteUser: vi.fn(),
  mockRateLimitResponse: vi.fn(),
  mockUpdate: vi.fn(),
  mockIdFilter: vi.fn(),
  mockUserFilter: vi.fn(),
  mockSelect: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/api/routeGuards", () => ({
  isGuardResponse: (result: object) => "response" in result,
  readJsonBody: async (request: Request) => ({ body: await request.json() }),
  readJsonObject: async (request: Request) => ({ body: await request.json() }),
  rateLimitResponse: mockRateLimitResponse,
  requireRouteUser: mockRequireRouteUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/logger", () => ({
  generateRequestId: () => "request-1",
  logger: {
    error: vi.fn(),
    requestComplete: vi.fn(),
    warn: vi.fn(),
  },
}));

import { PATCH } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/garments/g1/favorite", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/garments/[id]/favorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRouteUser.mockResolvedValue({
      user: { id: "user-1" },
      supabase: { from: mockFrom },
    });
    mockRateLimitResponse.mockReturnValue(null);
    mockUpdate.mockReturnValue({ eq: mockIdFilter });
    mockIdFilter.mockReturnValue({ eq: mockUserFilter });
    mockUserFilter.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockMaybeSingle.mockResolvedValue({
      data: { garment_id: "00000000-0000-4000-8000-000000000001" },
      error: null,
    });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it("validates and updates only a row owned by the session user", async () => {
    const response = await PATCH(request({ is_favorite: true }), {
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }),
    });

    expect(response.status).toBe(200);
    expect(mockRequireRouteUser).toHaveBeenCalledWith(
      "favorite",
      "request-1",
      expect.any(Number),
    );
    expect(mockRateLimitResponse).toHaveBeenCalledWith(
      "favorite",
      "user-1",
      "request-1",
      { from: mockFrom },
    );
    expect(mockUpdate).toHaveBeenCalledWith({ is_favorite: true });
    expect(mockIdFilter).toHaveBeenCalledWith(
      "garment_id",
      "00000000-0000-4000-8000-000000000001",
    );
    expect(mockUserFilter).toHaveBeenCalledWith("user_id", "user-1");
    await expect(response.json()).resolves.toEqual({
      success: true,
      is_favorite: true,
    });
  });

  it("rejects non-boolean favorite values before writing", async () => {
    const response = await PATCH(request({ is_favorite: "yes" }), {
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }),
    });

    expect(response.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects malformed garment IDs", async () => {
    const response = await PATCH(request({ is_favorite: true }), {
      params: Promise.resolve({ id: "g1" }),
    });
    expect(response.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when no owned garment was updated", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const response = await PATCH(request({ is_favorite: true }), {
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }),
    });
    expect(response.status).toBe(404);
  });
});
