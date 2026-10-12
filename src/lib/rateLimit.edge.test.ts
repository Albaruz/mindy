// Edge-behavior tests for the in-memory sliding-window rate limiter.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RATE_LIMIT_MAX_KEYS } from "@/constants/api";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit edge behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expires the window so requests are allowed again", () => {
    const key = `edge-window-${Date.now()}-a`;
    const windowMs = 60_000;
    expect(checkRateLimit(key, 1, windowMs).limited).toBe(false);
    expect(checkRateLimit(key, 1, windowMs).limited).toBe(true);
    vi.advanceTimersByTime(windowMs + 1);
    expect(checkRateLimit(key, 1, windowMs).limited).toBe(false);
  });

  it("computes retryAfterSec from the oldest hit in the window", () => {
    const key = `edge-retry-${Date.now()}-b`;
    const windowMs = 60_000;
    checkRateLimit(key, 1, windowMs);
    vi.advanceTimersByTime(10_000);
    const blocked = checkRateLimit(key, 1, windowMs);
    expect(blocked.limited).toBe(true);
    // Oldest hit was 10s ago in a 60s window: 50s remaining.
    expect(blocked.retryAfterSec).toBe(50);
  });

  it("floors retryAfterSec at 1 second", () => {
    const key = `edge-floor-${Date.now()}-c`;
    const windowMs = 1_000;
    checkRateLimit(key, 1, windowMs);
    vi.advanceTimersByTime(999);
    const blocked = checkRateLimit(key, 1, windowMs);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("evicts the oldest key once the map exceeds RATE_LIMIT_MAX_KEYS", () => {
    expect(RATE_LIMIT_MAX_KEYS).toBeGreaterThan(0);
    const stamp = Date.now();
    for (let i = 0; i < RATE_LIMIT_MAX_KEYS + 1; i += 1) {
      checkRateLimit(`edge-evict-${stamp}-${i}`, 1, 60_000);
    }
    // The first key was evicted, so its bucket is fresh again.
    const reused = checkRateLimit(`edge-evict-${stamp}-0`, 1, 60_000);
    expect(reused.limited).toBe(false);
  });
});
