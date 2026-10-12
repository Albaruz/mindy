import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit branch coverage", () => {
  it("limits immediately when the limit is zero (empty history fallback)", () => {
    const key = `branch-zero-${Date.now()}`;
    const result = checkRateLimit(key, 0, 60_000);
    expect(result.limited).toBe(true);
    expect(result.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("returns at least one second of retry delay on a fresh window", () => {
    const key = `branch-fresh-${Date.now()}`;
    checkRateLimit(key, 1, 60_000);
    const blocked = checkRateLimit(key, 1, 60_000);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
  });
});
