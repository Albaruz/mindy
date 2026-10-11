// @vitest-environment node
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

import proxy from "./proxy";
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

function sessionResult(
  user: { id: string } | null,
  maybeSingle: () => Promise<unknown>,
) {
  const single = vi.fn(maybeSingle);
  const eq = vi.fn(() => ({ maybeSingle: single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const headers = new Headers();
  return {
    response: {
      headers,
      passthrough: true,
    },
    user,
    supabase: { from },
  };
}

const completeProfile = async () => ({
  data: {
    colorimetry: "autumn",
    morphology: "rectangle",
    preferred_fit: "regular",
    lifestyle: "casual_daily",
  },
});

describe("proxy branch coverage", () => {
  beforeEach(() => {
    mockUpdateSession.mockReset();
    mockIntlHandler.mockReset();
    vi.mocked(NextResponse.redirect).mockClear();
    mockIntlHandler.mockImplementation(
      async () => new Response("pass-through", { status: 200 }),
    );
  });

  it("forwards intl cookies via getSetCookie into the session response", async () => {
    const intlResponse = new Response("pass-through", { status: 200 });
    intlResponse.headers.append("set-cookie", "locale-a=es; Path=/");
    intlResponse.headers.append("set-cookie", "locale-b=en; Path=/");
    mockIntlHandler.mockResolvedValue(intlResponse);
    const session = sessionResult({ id: "user-1" }, completeProfile);
    mockUpdateSession.mockResolvedValue(session);
    const result = (await proxy(
      makeRequest("/es/generator") as never,
    )) as unknown as { headers: Headers };
    expect(result.headers.getSetCookie().length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to splitting the set-cookie header without getSetCookie", async () => {
    mockIntlHandler.mockResolvedValue({
      status: 200,
      headers: {
        has: () => false,
        get: (name: string) =>
          name === "set-cookie" ? "locale-a=es; Path=/" : null,
      },
    });
    const appended: string[] = [];
    const session = sessionResult({ id: "user-1" }, completeProfile);
    session.response.headers.append = ((name: string, value: string) => {
      appended.push(`${name}:${value}`);
    }) as Headers["append"];
    mockUpdateSession.mockResolvedValue(session);
    await proxy(makeRequest("/es/generator") as never);
    expect(appended.some((entry) => entry.includes("locale-a=es"))).toBe(true);
  });

  it("lets the oauth callback through without a session", async () => {
    const session = sessionResult(null, async () => ({ data: null }));
    mockUpdateSession.mockResolvedValue(session);
    const result = await proxy(makeRequest("/auth/callback") as never);
    expect(result).toBe(session.response);
  });

  it("sends signed-in users to onboarding when the profile check rejects", async () => {
    const { NextResponse: RedirectResponse } = await import("next/server");
    const session = sessionResult({ id: "user-1" }, async () => {
      throw new Error("profile lookup down");
    });
    mockUpdateSession.mockResolvedValue(session);
    await proxy(makeRequest("/es") as never);
    expect(
      vi.mocked(RedirectResponse.redirect).mock.calls[0]?.[0]?.toString(),
    ).toBe("http://localhost:3000/es/profile/onboarding");
  });

  it("keeps signed-in users on locale pages instead of redirecting", async () => {
    const session = sessionResult({ id: "user-1" }, completeProfile);
    mockUpdateSession.mockResolvedValue(session);
    const result = await proxy(makeRequest("/es/generator") as never);
    expect(result).toBe(session.response);
  });
});
