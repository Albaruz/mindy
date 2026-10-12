import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const first = checkRateLimit(key, 2, 60_000);
    const second = checkRateLimit(key, 2, 60_000);
    expect(first.limited).toBe(false);
    expect(second.limited).toBe(false);
  });

  it("blocks requests over the limit with retry delay", () => {
    const key = `test-block-${Date.now()}`;
    checkRateLimit(key, 1, 60_000);
    const blocked = checkRateLimit(key, 1, 60_000);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
