import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

import { cookies, headers } from "next/headers";
import { resolveRequestLocale } from "./serverLocale";

const mockCookies = vi.mocked(cookies);
const mockHeaders = vi.mocked(headers);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveRequestLocale branch coverage", () => {
  it("falls back to the default locale when the header lookup throws", async () => {
    mockCookies.mockResolvedValue({
      get: () => undefined,
    } as never);
    mockHeaders.mockRejectedValue(new Error("headers unavailable"));
    await expect(resolveRequestLocale()).resolves.toBe("en");
  });

  it("ignores an unsupported cookie when the header lookup throws", async () => {
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "fr" } : undefined,
    } as never);
    mockHeaders.mockRejectedValue(new Error("headers unavailable"));
    await expect(resolveRequestLocale()).resolves.toBe("en");
  });
});
