// Unit tests for pure remember-me cookie helpers.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_PATH,
  REMEMBER_ABSOLUTE_MAX_AGE_SECONDS,
  REMEMBER_COOKIE,
  REMEMBER_DAYS,
  REMEMBER_MAX_AGE_SECONDS,
  REMEMBER_SINCE_COOKIE,
  isProduction,
  isRememberActive,
  rememberCookieFlags,
} from "./cookies";

describe("supabase cookies", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes cookie names and 30-day windows", () => {
    expect(REMEMBER_COOKIE).toBe("mindy_remember");
    expect(REMEMBER_SINCE_COOKIE).toBe("mindy_remember_since");
    expect(REMEMBER_DAYS).toBe(30);
    expect(REMEMBER_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(REMEMBER_ABSOLUTE_MAX_AGE_SECONDS).toBe(
      REMEMBER_MAX_AGE_SECONDS,
    );
    expect(COOKIE_PATH).toBe("/");
  });

  it("detects production from NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isProduction()).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(isProduction()).toBe(false);
  });

  it("builds HttpOnly Lax flags, Secure only in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(rememberCookieFlags(100)).toEqual({
      maxAge: 100,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
    vi.stubEnv("NODE_ENV", "development");
    expect(rememberCookieFlags(100).secure).toBe(false);
  });

  it("activates remember only with the opt-in flag", () => {
    expect(isRememberActive(undefined, undefined)).toBe(false);
    expect(isRememberActive("0", undefined)).toBe(false);
    expect(isRememberActive("1", undefined)).toBe(true);
  });

  it("honors the absolute window from the since stamp", () => {
    const nowMs = Date.now();
    const fresh = String(Math.floor(nowMs / 1000) - 60);
    expect(isRememberActive("1", fresh, nowMs)).toBe(true);
    const stale = String(
      Math.floor(nowMs / 1000) - REMEMBER_ABSOLUTE_MAX_AGE_SECONDS - 1,
    );
    expect(isRememberActive("1", stale, nowMs)).toBe(false);
    expect(isRememberActive("1", "not-a-number", nowMs)).toBe(false);
  });
});
