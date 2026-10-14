import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentPosition } from "./geolocation";

describe("getCurrentPosition", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with the browser position", async () => {
    const position = { coords: { latitude: 1, longitude: 2 } };
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) => ok(position),
      },
    });
    await expect(getCurrentPosition()).resolves.toBe(position);
  });

  it("rejects when the browser denies access", async () => {
    const error = new Error("denied");
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: unknown, fail: (e: Error) => void) =>
          fail(error),
      },
    });
    await expect(getCurrentPosition()).rejects.toBe(error);
  });

  it("rejects when geolocation is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await expect(getCurrentPosition()).rejects.toThrow("not available");
  });
});