// @vitest-environment node
// Unit tests for the OAuth callback route handler.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/serverLocale", () => ({
  resolveRequestLocale: vi.fn(async () => "es"),
}));

import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

const mockCreateClient = vi.mocked(createClient);

function profileQuery(complete: boolean) {
  const maybeSingle = vi.fn(async () =>
    complete
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
  return { from: vi.fn(() => ({ select })) };
}

function mockExchange(result: {
  user: { id: string } | null;
  error?: { message: string } | null;
  profileComplete?: boolean;
  throws?: boolean;
}) {
  const exchangeCodeForSession = vi.fn(async () => {
    if (result.throws === true) {
      throw new Error("exchange crashed");
    }
    return {
      data: { user: result.user },
      error: result.error ?? null,
    };
  });
  mockCreateClient.mockResolvedValue({
    auth: { exchangeCodeForSession },
    ...profileQuery(result.profileComplete ?? false),
  } as unknown as Awaited<ReturnType<typeof createClient>>);
  return exchangeCodeForSession;
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects home when the code is missing", async () => {
    const response = await GET(
      new Request("http://localhost:3000/auth/callback"),
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("redirects home when the exchange fails", async () => {
    mockExchange({ user: null, error: { message: "bad code" } });
    const response = await GET(
      new Request("http://localhost:3000/auth/callback?code=bad"),
    );
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects home when the exchange throws", async () => {
    mockExchange({ user: { id: "user-1" }, throws: true });
    const response = await GET(
      new Request("http://localhost:3000/auth/callback?code=boom"),
    );
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("honors a safe next param", async () => {
    mockExchange({ user: { id: "user-1" } });
    const response = await GET(
      new Request(
        "http://localhost:3000/auth/callback?code=ok&next=/es/reset-password",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/es/reset-password",
    );
  });

  it("rejects an open-redirect next param and applies the destination rule", async () => {
    mockExchange({ user: { id: "user-1" }, profileComplete: false });
    const response = await GET(
      new Request(
        "http://localhost:3000/auth/callback?code=ok&next=//evil.example",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/es/profile/onboarding",
    );
  });

  it("sends complete profiles to the generator", async () => {
    mockExchange({ user: { id: "user-1" }, profileComplete: true });
    const response = await GET(
      new Request("http://localhost:3000/auth/callback?code=ok"),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/es/generator",
    );
  });

  it("sends incomplete profiles to onboarding", async () => {
    mockExchange({ user: { id: "user-1" }, profileComplete: false });
    const response = await GET(
      new Request("http://localhost:3000/auth/callback?code=ok"),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/es/profile/onboarding",
    );
  });
});
