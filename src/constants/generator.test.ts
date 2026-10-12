// Unit tests for generator business caps.
import { describe, expect, it } from "vitest";
import {
  CAROUSEL_LOOP_MIN_SLIDES,
  MAX_DISCARD_COUNT,
  MAX_LOOK_OPTIONS,
} from "./generator";

describe("generator constants", () => {
  it("exposes expected cap values", () => {
    expect(MAX_LOOK_OPTIONS).toBe(3);
    expect(MAX_DISCARD_COUNT).toBe(4);
    expect(CAROUSEL_LOOP_MIN_SLIDES).toBe(3);
  });

  it("keeps caps positive integers", () => {
    for (const value of [
      MAX_LOOK_OPTIONS,
      MAX_DISCARD_COUNT,
      CAROUSEL_LOOP_MIN_SLIDES,
    ]) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});
