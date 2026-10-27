// @vitest-environment node
// Unit tests for the composed proxy: locale redirect + auth guards.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockIntlHandler, mockUpdateSession } = vi.hoisted(() => ({
  mockIntlHandler: vi.fn(
    async () => new Response("pass-through", { status: 200 }),
  ),
  mockUpdateSession: vi.fn(),
}));

vi.mock("next-intl/middleware", () => ({
  default: vi.fn(() => mockIntlHandler),
}));

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) =>
    (mockUpdateSession as (...a: unknown[]) => unknown)(...args),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn((url: URL | string) => ({ redirectedTo: url.toString() })),
    next: vi.fn(() => ({ passthrough: true })),
  },
}));

import proxy, { config } from "./proxy";
import { NextResponse } from "next/server";

function makeRequest(path: string) {
  const url = new URL(`http://localhost:3000${path}`);
  const nextUrl = url as URL & { clone: () => URL };
  nextUrl.clone = () => new URL(url.toString());
  return {
    nextUrl,
    cookies: { get: () => undefined, getAll: () => [] },
  };
}

function sessionResult(user: { id: string } | null, profileComplete: boolean) {
  const maybeSingle = vi.fn(async () =>
    profileComplete
      ? {
          data: {
            colorimetry: "autumn",
            morphology: "rectangle",
            preferred_fit: "regular",
            lifestyle: "casual_daily",
          },
        }
      : { data: null },
  );
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    response: { passthrough: true },
    user,
    supabase: { from },
  };
}

describe("proxy", () => {
  beforeEach(() => {
    mockUpdateSession.mockReset();
    mockIntlHandler.mockReset();
    vi.mocked(NextResponse.redirect).mockClear();
    vi.mocked(NextResponse.next).mockClear();
    mockIntlHandler.mockImplementation(
      async () => new Response("pass-through", { status: 200 }),
    );
  });

  it("returns the locale redirect when next-intl negotiates one", async () => {
    mockIntlHandler.mockResolvedValue(
      new Response(null, {
        status: 307,
        headers: { location: "/es/closet" },
      }),
    );
    mockUpdateSession.mockResolvedValue(sessionResult(null, false));
    const result = (await proxy(makeRequest("/closet") as never)) as Response;
    expect(result.status).toBe(307);
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });

  it("excludes locale-free API and OAuth paths from the page proxy", () => {
    expect(config.matcher[0]).toContain("api|auth");
  });

  it("redirects anonymous users away from guarded pages", async () => {
    const { NextResponse } = await import("next/server");
    mockUpdateSession.mockResolvedValue(sessionResult(null, false));
    await proxy(makeRequest("/es/closet") as never);
    expect(vi.mocked(NextResponse.redirect).mock.calls[0]?.[0]?.toString()).toBe(
      "http://localhost:3000/es/",
    );
  });

  it("lets anonymous users reach the localized landing page", async () => {
    const session = sessionResult(null, false);
    mockUpdateSession.mockResolvedValue(session);
    const result = await proxy(makeRequest("/es") as never);
    expect(result).toBe(session.response);
  });

  it("sends signed-in users with a complete profile to the generator", async () => {
    const { NextResponse } = await import("next/server");
    mockUpdateSession.mockResolvedValue(
      sessionResult({ id: "user-1" }, true),
    );
    await proxy(makeRequest("/es") as never);
    expect(vi.mocked(NextResponse.redirect).mock.calls[0]?.[0]?.toString()).toBe(
      "http://localhost:3000/es/generator",
    );
  });

  it("sends signed-in users with an incomplete profile to onboarding", async () => {
    const { NextResponse } = await import("next/server");
    mockUpdateSession.mockResolvedValue(
      sessionResult({ id: "user-1" }, false),
    );
    await proxy(makeRequest("/es") as never);
    expect(vi.mocked(NextResponse.redirect).mock.calls[0]?.[0]?.toString()).toBe(
      "http://localhost:3000/es/profile/onboarding",
    );
  });
});
