// @vitest-environment node
// Unit tests for the server Supabase client factory (mocked Next cookies).
// SKIPPED: live cookie round-trips need real Next.js request-scoped
// cookies(); only the branching logic below is exercised with mocks.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockGetAll = vi.fn(() => []);
const mockSet = vi.fn();
const mockCreateServerClient = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => mockGet(name),
    getAll: () => mockGetAll(),
    set: (name: string, value: string, options: Record<string, unknown>) =>
      mockSet(name, value, options),
  })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) =>
    mockCreateServerClient(...args),
}));

import { createClient } from "./server";
import {
  COOKIE_PATH,
  REMEMBER_COOKIE,
  REMEMBER_MAX_AGE_SECONDS,
  REMEMBER_SINCE_COOKIE,
} from "./cookies";

describe("supabase server createClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(undefined);
    mockGetAll.mockReturnValue([]);
    mockCreateServerClient.mockReturnValue({ mocked: true });
  });

  it("creates a client with fallback URL config", async () => {
    const client = await createClient();
    expect(client).toEqual({ mocked: true });
    expect(mockCreateServerClient).toHaveBeenCalledOnce();
    const [url] = mockCreateServerClient.mock.calls[0] as unknown as string[];
    expect(typeof url).toBe("string");
  });

  it("applies the 30-day max-age when persistent opt-in is explicit", async () => {
    await createClient({ persistent: true });
    const [, , options] = mockCreateServerClient.mock.calls[0] as unknown as [
      unknown,
      unknown,
      { cookies: { setAll: (items: unknown[]) => void } },
    ];
    options.cookies.setAll([
      { name: "sb-session", value: "abc", options: {} },
    ]);
    expect(mockSet).toHaveBeenCalledWith(
      "sb-session",
      "abc",
      expect.objectContaining({
        maxAge: REMEMBER_MAX_AGE_SECONDS,
        path: COOKIE_PATH,
      }),
    );
  });

  it("derives persistence from the remember cookies when no option is passed", async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === REMEMBER_COOKIE) return { value: "1" };
      if (name === REMEMBER_SINCE_COOKIE) return undefined;
      return undefined;
    });
    await createClient();
    const [, , options] = mockCreateServerClient.mock.calls[0] as unknown as [
      unknown,
      unknown,
      { cookies: { setAll: (items: unknown[]) => void } },
    ];
    options.cookies.setAll([
      { name: "sb-session", value: "abc", options: {} },
    ]);
    // Legacy flag without a stamp counts as active once.
    expect(mockSet).toHaveBeenCalledWith(
      "sb-session",
      "abc",
      expect.objectContaining({ maxAge: REMEMBER_MAX_AGE_SECONDS }),
    );
  });

  it("keeps session cookies when the remember flag is absent", async () => {
    await createClient();
    const [, , options] = mockCreateServerClient.mock.calls[0] as unknown as [
      unknown,
      unknown,
      { cookies: { setAll: (items: unknown[]) => void } },
    ];
    options.cookies.setAll([
      { name: "sb-session", value: "abc", options: {} },
    ]);
    expect(mockSet).toHaveBeenCalledWith("sb-session", "abc", {});
  });

  it("skips cookie round-trip coverage needing real Next.js cookies", () => {
    // Report: Server Component read-only cookie errors and real
    // request-scoped cookie persistence are not exercised here.
    expect(true).toBe(true);
  });
});
