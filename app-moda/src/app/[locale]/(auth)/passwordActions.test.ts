// @vitest-environment node
// Unit tests for the password recovery actions: validation, origin
// resolution, rate-limit mapping, and the password update flow.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockHeaderGet } = vi.hoisted(() => ({
  mockHeaderGet: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: mockHeaderGet })),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/lib/serverLocale", () => ({
  resolveRequestLocale: vi.fn(async () => "es"),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  requestPasswordResetAction,
  updatePasswordAction,
} from "./passwordActions";

const mockCreateClient = vi.mocked(createClient);
const mockRevalidatePath = vi.mocked(revalidatePath);

const INITIAL = { error: null, message: null };
const SITE_URL = "https://mindy.example";

function emailForm(email: string): FormData {
  const data = new FormData();
  data.set("email", email);
  return data;
}

function passwordForm(password: string, confirm: string): FormData {
  const data = new FormData();
  data.set("password", password);
  data.set("confirm", confirm);
  return data;
}

function mockAuth(auth: Record<string, unknown>) {
  mockCreateClient.mockResolvedValue({
    auth,
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

describe("requestPasswordResetAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
    mockHeaderGet.mockReturnValue(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects an invalid email without calling Supabase", async () => {
    const result = await requestPasswordResetAction(INITIAL, emailForm("bad"));
    expect(result).toEqual({ ...INITIAL, error: "invalidEmail" });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("sends the recovery email with the localized redirect", async () => {
    const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
    mockAuth({ resetPasswordForEmail });
    const result = await requestPasswordResetAction(
      INITIAL,
      emailForm("User@Example.com"),
    );
    expect(result).toEqual({ ...INITIAL, message: "resetSent" });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: `${SITE_URL}/es/reset-password`,
    });
  });

  it("falls back to request headers when no site URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    mockHeaderGet.mockImplementation((name: string) => {
      if (name === "x-forwarded-proto") {
        return "https";
      }
      if (name === "host") {
        return "dev.local:3000";
      }
      return null;
    });
    const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
    mockAuth({ resetPasswordForEmail });
    const result = await requestPasswordResetAction(
      INITIAL,
      emailForm("user@example.com"),
    );
    expect(result).toEqual({ ...INITIAL, message: "resetSent" });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://dev.local:3000/es/reset-password",
    });
  });

  it("throws in production when no site URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
    mockAuth({ resetPasswordForEmail });
    await expect(
      requestPasswordResetAction(INITIAL, emailForm("user@example.com")),
    ).rejects.toThrow("Missing NEXT_PUBLIC_SITE_URL");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("maps a 429 failure to the rate-limited message", async () => {
    const resetPasswordForEmail = vi.fn(async () => ({
      error: { status: 429, message: "too many requests" },
    }));
    mockAuth({ resetPasswordForEmail });
    const result = await requestPasswordResetAction(
      INITIAL,
      emailForm("user@example.com"),
    );
    expect(result).toEqual({ ...INITIAL, error: "resetRateLimited" });
  });

  it("maps a rate-limit message to the rate-limited message", async () => {
    const resetPasswordForEmail = vi.fn(async () => ({
      error: { status: 400, code: "over_rate_limit", message: "slow down" },
    }));
    mockAuth({ resetPasswordForEmail });
    const result = await requestPasswordResetAction(
      INITIAL,
      emailForm("user@example.com"),
    );
    expect(result).toEqual({ ...INITIAL, error: "resetRateLimited" });
  });

  it("returns a generic failure for other send errors", async () => {
    const resetPasswordForEmail = vi.fn(async () => ({
      error: { status: 500, message: "smtp down" },
    }));
    mockAuth({ resetPasswordForEmail });
    const result = await requestPasswordResetAction(
      INITIAL,
      emailForm("user@example.com"),
    );
    expect(result).toEqual({ ...INITIAL, error: "resetRequestFailed" });
  });
});

describe("updatePasswordAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects a short password without calling Supabase", async () => {
    const result = await updatePasswordAction(INITIAL, passwordForm("123", "123"));
    expect(result).toEqual({ ...INITIAL, error: "shortPassword" });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("rejects a mismatched confirmation without calling Supabase", async () => {
    const result = await updatePasswordAction(
      INITIAL,
      passwordForm("secret12", "different"),
    );
    expect(result).toEqual({ ...INITIAL, error: "passwordMismatch" });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("returns a failure when the update fails", async () => {
    const updateUser = vi.fn(async () => ({
      error: { message: "session expired" },
    }));
    mockAuth({ updateUser });
    const result = await updatePasswordAction(
      INITIAL,
      passwordForm("secret12", "secret12"),
    );
    expect(result).toEqual({ ...INITIAL, error: "resetUpdateFailed" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("confirms the update and revalidates the layout", async () => {
    const updateUser = vi.fn(async () => ({ error: null }));
    mockAuth({ updateUser });
    const result = await updatePasswordAction(
      INITIAL,
      passwordForm("secret12", "secret12"),
    );
    expect(result).toEqual({ ...INITIAL, message: "passwordUpdated" });
    expect(updateUser).toHaveBeenCalledWith({ password: "secret12" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
