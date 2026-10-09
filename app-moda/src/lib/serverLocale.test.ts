import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { resolveRequestLocale } from "./serverLocale";

const mockCookies = vi.mocked(cookies);

function cookieStore(value: string | undefined) {
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name === "NEXT_LOCALE" && value !== undefined
        ? { value }
        : undefined,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveRequestLocale", () => {
  it("returns the stored locale when supported", async () => {
    cookieStore("es");
    await expect(resolveRequestLocale()).resolves.toBe("es");
  });

  it("falls back to the default locale when no cookie is set", async () => {
    cookieStore(undefined);
    await expect(resolveRequestLocale()).resolves.toBe("en");
  });

  it("falls back to the default locale for unknown values", async () => {
    cookieStore("fr");
    await expect(resolveRequestLocale()).resolves.toBe("en");
  });
});
