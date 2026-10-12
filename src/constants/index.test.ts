// Unit tests for the constants barrel export.
import { describe, expect, it } from "vitest";
import * as barrel from "./index";

describe("constants barrel", () => {
  it("re-exports generator caps", () => {
    expect(barrel.MAX_LOOK_OPTIONS).toBe(3);
    expect(barrel.MAX_DISCARD_COUNT).toBe(4);
    expect(barrel.CAROUSEL_LOOP_MIN_SLIDES).toBe(3);
  });

  it("re-exports animation values", () => {
    expect(barrel.CELEBRATION_BURST_MS).toBe(1400);
    expect(barrel.SAVE_ARM_DELAY_MS).toBe(500);
  });

  it("re-exports query, geo, storage and validation keys", () => {
    expect(barrel.QUERY_KEYS).toBeDefined();
    expect(barrel.GEOLOCATION_TIMEOUT_MS).toBe(8000);
    expect(barrel.TABLES).toBeDefined();
    expect(barrel.PASSWORD_MIN_LENGTH).toBe(6);
    expect(barrel.API_ROUTES).toBeDefined();
    expect(barrel.RATE_LIMIT_MAX_KEYS).toBe(5000);
  });

  it("re-exports UI config values", () => {
    expect(barrel.MEASURE_MIN_CM).toBe(70);
    expect(barrel.TOTAL_STEPS).toBe(5);
    expect(typeof barrel.clampMeasurement).toBe("function");
  });

  it("re-exports profile helpers", () => {
    expect(barrel.SKIN_TONES).toBeDefined();
    expect(typeof barrel.inferColorimetry).toBe("function");
  });
});
