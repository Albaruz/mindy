// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockCreateBrowserClient } = vi.hoisted(() => ({
  mockCreateBrowserClient: vi.fn(() => ({ browser: true })),
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) =>
    mockCreateBrowserClient(...args),
}));

import { createClient } from "./client";

describe("supabase browser client branch coverage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses configured environment credentials when present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://env.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "env-anon-key");
    const client = createClient();
    expect(client).toEqual({ browser: true });
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://env.supabase.co",
      "env-anon-key",
    );
  });

  it("falls back to bundled constants when env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { SUPABASE_ANON_FALLBACK, SUPABASE_URL_FALLBACK } = await import(
      "@/constants/storage"
    );
    createClient();
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      SUPABASE_URL_FALLBACK,
      SUPABASE_ANON_FALLBACK,
    );
  });
});
