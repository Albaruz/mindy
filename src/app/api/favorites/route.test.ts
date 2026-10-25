// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockOrder, mockFilters, mockRequireRouteUser } = vi.hoisted(
  () => ({
    mockFrom: vi.fn(),
    mockOrder: vi.fn(),
    mockFilters: vi.fn(),
    mockRequireRouteUser: vi.fn(),
  }),
);

vi.mock("@/lib/api/routeGuards", () => ({
  isGuardResponse: (result: object) => "response" in result,
  requireRouteUser: mockRequireRouteUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

vi.mock("@/lib/logger", () => ({
  generateRequestId: () => "request-1",
  logger: {
    error: vi.fn(),
    requestComplete: vi.fn(),
  },
}));

import { GET } from "./route";

describe("GET /api/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRouteUser.mockResolvedValue({ user: { id: "user-1" } });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: mockOrder,
    };
    query.select.mockReturnValue(query);
    query.eq.mockImplementation((...args: unknown[]) => {
      mockFilters(...args);
      return query;
    });
    mockFrom.mockReturnValue(query);
    mockOrder.mockResolvedValue({ data: [], error: null });
  });

  it("scopes the favorites query to the authenticated user", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mockRequireRouteUser).toHaveBeenCalledWith(
      "favorite",
      "request-1",
      expect.any(Number),
    );
    expect(mockFrom).toHaveBeenCalledWith("garments");
    expect(mockFilters).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(mockFilters).toHaveBeenNthCalledWith(2, "is_favorite", true);
    expect(response.headers.get("Cache-Control")).toContain("private");
  });
});
