// Unit tests for geolocation settings.
import { describe, expect, it } from "vitest";
import { GEOLOCATION_MAX_AGE_MS, GEOLOCATION_TIMEOUT_MS } from "./geo";

describe("geo constants", () => {
  it("exposes expected values", () => {
    expect(GEOLOCATION_TIMEOUT_MS).toBe(8000);
    expect(GEOLOCATION_MAX_AGE_MS).toBe(600_000);
  });

  it("keeps cache age above request timeout", () => {
    expect(GEOLOCATION_MAX_AGE_MS).toBeGreaterThan(GEOLOCATION_TIMEOUT_MS);
  });
});
