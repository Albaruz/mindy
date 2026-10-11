import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

import { cookies, headers } from "next/headers";
import { resolveRequestLocale } from "./serverLocale";

const mockCookies = vi.mocked(cookies);
const mockHeaders = vi.mocked(headers);

function cookieStore(value: string | undefined) {
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name === "NEXT_LOCALE" && value !== undefined
        ? { value }
        : undefined,
  } as never);
}

function headerStore(acceptLanguage: string | null) {
  mockHeaders.mockResolvedValue({
    get: (name: string) =>
      name === "accept-language" ? acceptLanguage : null,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  headerStore(null);
});

describe("resolveRequestLocale", () => {
  it("returns the stored locale when supported", async () => {
    cookieStore("es");
    headerStore("en-US,en;q=0.9");
    await expect(resolveRequestLocale()).resolves.toBe("es");
  });

  it("negotiates the system language when no cookie is set", async () => {
    cookieStore(undefined);
    headerStore("es-ES,es;q=0.9,en;q=0.8");
    await expect(resolveRequestLocale()).resolves.toBe("es");
  });

  it("falls back to the default locale when neither cookie nor header match", async () => {
    cookieStore(undefined);
    headerStore("fr-FR,fr;q=0.9");
    await expect(resolveRequestLocale()).resolves.toBe("en");
  });

  it("falls back to the system language for unknown cookie values", async () => {
    cookieStore("fr");
    headerStore("es-ES,es;q=0.9");
    await expect(resolveRequestLocale()).resolves.toBe("es");
  });
});
