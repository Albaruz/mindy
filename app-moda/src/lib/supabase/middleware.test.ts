// @vitest-environment node
// Unit tests for updateSession: user resolution and the remember-me
// cookie branches (plain, stamp, expired, persistent).
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockCreateServerClient } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) =>
    (mockCreateServerClient as (...a: unknown[]) => unknown)(...args),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => ({
      cookies: { set: vi.fn(), delete: vi.fn() },
    })),
  },
}));

import { NextResponse } from "next/server";
import {
  REMEMBER_COOKIE,
  REMEMBER_MAX_AGE_SECONDS,
  REMEMBER_SINCE_COOKIE,
} from "./cookies";
import { updateSession } from "./middleware";

const mockNext = vi.mocked(NextResponse.next);

interface CookieHandler {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookiesToSet: { name: string; value: string; options?: object }[],
  ) => void;
}

let capturedCookies: CookieHandler | null = null;

function makeRequest(entries: [string, string][] = []) {
  const store = new Map(entries);
  return {
    cookies: {
      get: (name: string) =>
        store.has(name)
          ? { name, value: store.get(name) as string }
          : undefined,
      getAll: () =>
        [...store.entries()].map(([name, value]) => ({ name, value })),
      set: (name: string, value: string) => {
        store.set(name, value);
      },
    },
    store,
  };
}

function latestResponse() {
  const results = mockNext.mock.results;
  return results[results.length - 1]?.value as {
    cookies: { set: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  };
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCookies = null;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    mockCreateServerClient.mockImplementation(
      (_url: unknown, _key: unknown, config: { cookies: CookieHandler }) => {
        capturedCookies = config.cookies;
        return { auth: { getUser: mockGetUser } };
      },
    );
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("returns the authenticated user when a session exists", async () => {
    const request = makeRequest();
    const { response, user } = await updateSession(request as never);
    expect(user).toEqual({ id: "user-1" });
    expect(response).toBe(latestResponse());
    expect(mockGetUser).toHaveBeenCalledOnce();
  });

  it("returns a null user when no session exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { user } = await updateSession(makeRequest() as never);
    expect(user).toBeNull();
  });

  it("returns a null user when the backend is unreachable", async () => {
    mockGetUser.mockRejectedValue(new Error("backend down"));
    const { user } = await updateSession(makeRequest() as never);
    expect(user).toBeNull();
  });

  it("forwards request cookies to the Supabase client", async () => {
    const request = makeRequest([["sb-session", "abc"]]);
    await updateSession(request as never);
    expect(capturedCookies?.getAll()).toEqual([
      { name: "sb-session", value: "abc" },
    ]);
  });

  it("writes plain session cookies when remember-me is off", async () => {
    const request = makeRequest();
    await updateSession(request as never);
    capturedCookies?.setAll([{ name: "sb-session", value: "abc" }]);
    expect(request.store.get("sb-session")).toBe("abc");
    const response = latestResponse();
    expect(response.cookies.set).toHaveBeenCalledWith(
      "sb-session",
      "abc",
      {},
    );
    expect(response.cookies.delete).not.toHaveBeenCalled();
  });

  it("stamps a legacy remember flag without a since cookie", async () => {
    const request = makeRequest([[REMEMBER_COOKIE, "1"]]);
    await updateSession(request as never);
    capturedCookies?.setAll([{ name: "sb-session", value: "abc" }]);
    const response = latestResponse();
    const sinceCall = response.cookies.set.mock.calls.find(
      ([name]) => name === REMEMBER_SINCE_COOKIE,
    );
    expect(sinceCall).toBeDefined();
  });

  it("drops remember cookies when the absolute window lapsed", async () => {
    const request = makeRequest([
      [REMEMBER_COOKIE, "1"],
      [REMEMBER_SINCE_COOKIE, "1000000000"],
    ]);
    await updateSession(request as never);
    capturedCookies?.setAll([{ name: "sb-session", value: "abc" }]);
    const response = latestResponse();
    expect(response.cookies.delete).toHaveBeenCalledWith(REMEMBER_COOKIE);
    expect(response.cookies.delete).toHaveBeenCalledWith(REMEMBER_SINCE_COOKIE);
  });

  it("persists session cookies when remember-me is active", async () => {
    const nowSeconds = String(Math.floor(Date.now() / 1000));
    const request = makeRequest([
      [REMEMBER_COOKIE, "1"],
      [REMEMBER_SINCE_COOKIE, nowSeconds],
    ]);
    await updateSession(request as never);
    capturedCookies?.setAll([{ name: "sb-session", value: "abc" }]);
    const response = latestResponse();
    expect(response.cookies.delete).not.toHaveBeenCalled();
    expect(response.cookies.set).toHaveBeenCalledWith(
      "sb-session",
      "abc",
      expect.objectContaining({
        maxAge: REMEMBER_MAX_AGE_SECONDS,
        path: "/",
      }),
    );
  });
});
