import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit branch coverage", () => {
  it("limits immediately when the limit is zero (empty history fallback)", () => {
    const key = `branch-zero-${Date.now()}`;
    const result = checkRateLimit(key, 0, 60_000);
    expect(result.limited).toBe(true);
    expect(result.retryAfterSec).toBeGreaterThanOrEqual(1);
  });
});
