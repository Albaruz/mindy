// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockGetAll = vi.fn(() => [{ name: "sb-session", value: "abc" }]);
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

describe("supabase server createClient branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(undefined);
    mockGetAll.mockReturnValue([{ name: "sb-session", value: "abc" }]);
    mockCreateServerClient.mockReturnValue({ mocked: true });
  });

  it("exposes stored cookies through getAll", async () => {
    await createClient();
    const [, , options] = mockCreateServerClient.mock.calls[0] as unknown as [
      unknown,
      unknown,
      { cookies: { getAll: () => unknown[] } },
    ];
    expect(options.cookies.getAll()).toEqual([
      { name: "sb-session", value: "abc" },
    ]);
  });

  it("swallows cookie writes from read-only server components", async () => {
    mockSet.mockImplementation(() => {
      throw new Error("read-only cookies");
    });
    await createClient();
    const [, , options] = mockCreateServerClient.mock.calls[0] as unknown as [
      unknown,
      unknown,
      { cookies: { setAll: (items: unknown[]) => void } },
    ];
    expect(() =>
      options.cookies.setAll([
        { name: "sb-session", value: "abc", options: {} },
      ]),
    ).not.toThrow();
  });
});
