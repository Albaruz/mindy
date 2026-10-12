// Unit tests for TanStack Query defaults and keys.
import { describe, expect, it } from "vitest";
import {
  QUERY_KEYS,
  QUERY_NETWORK_MODE,
  QUERY_PERSIST_MAX_AGE_MS,
  QUERY_REFETCH_ON_FOCUS,
  QUERY_RETRY_COUNT,
  QUERY_STALE_TIME_MS,
  WEATHER_STALE_TIME_MS,
} from "./query";

describe("query constants", () => {
  it("exposes all cache keys", () => {
    expect(Object.keys(QUERY_KEYS).sort()).toEqual(
      ["garments", "history", "laundryBasket", "profile", "weather"].sort(),
    );
    expect(QUERY_KEYS.garments).toEqual(["garments"]);
    expect(QUERY_KEYS.profile).toEqual(["profile"]);
    expect(QUERY_KEYS.laundryBasket).toEqual(["laundry-basket"]);
    expect(QUERY_KEYS.history).toEqual(["outfit-history"]);
    expect(QUERY_KEYS.weather).toEqual(["weather"]);
  });

  it("exposes expected defaults", () => {
    expect(QUERY_STALE_TIME_MS).toBe(30_000);
    expect(QUERY_RETRY_COUNT).toBe(1);
    expect(QUERY_REFETCH_ON_FOCUS).toBe(false);
    expect(QUERY_NETWORK_MODE).toBe("offlineFirst");
    expect(QUERY_PERSIST_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
    expect(WEATHER_STALE_TIME_MS).toBe(10 * 60 * 1000);
  });
});
