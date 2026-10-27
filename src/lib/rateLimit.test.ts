import { describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  it("maps the durable RPC result returned as a row array", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ limited: true, retry_after_sec: 12 }],
      error: null,
    });

    await expect(
      checkRateLimit({ rpc } as never, "weather"),
    ).resolves.toEqual({ limited: true, retryAfterSec: 12 });
    expect(rpc).toHaveBeenCalledWith("consume_api_rate_limit", {
      p_key: "weather",
    });
  });

  it("also accepts a single row response", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { limited: false, retry_after_sec: 0 },
      error: null,
    });
    await expect(
      checkRateLimit({ rpc } as never, "analyze"),
    ).resolves.toEqual({ limited: false, retryAfterSec: 0 });
  });

  it("propagates database errors", async () => {
    const error = new Error("database unavailable");
    const rpc = vi.fn().mockResolvedValue({ data: null, error });
    await expect(
      checkRateLimit({ rpc } as never, "recommender"),
    ).rejects.toBe(error);
  });

  it("rejects malformed RPC data", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    await expect(
      checkRateLimit({ rpc } as never, "favorite"),
    ).rejects.toThrow("invalid response");
  });
});
