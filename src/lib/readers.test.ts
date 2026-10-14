import { describe, expect, it } from "vitest";
import { isRecord, readFiniteNumber, readString } from "./readers";

describe("readers", () => {
  it("isRecord accepts objects and arrays but not null or primitives", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("x")).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });

  it("readString returns non-empty strings and truncates to maxLength", () => {
    expect(readString("hello")).toBe("hello");
    expect(readString("hello", 3)).toBe("hel");
    expect(readString("a".repeat(500))).toHaveLength(200);
    expect(readString("")).toBeNull();
    expect(readString(4)).toBeNull();
  });

  it("readFiniteNumber rejects NaN, Infinity and non-numbers", () => {
    expect(readFiniteNumber(0)).toBe(0);
    expect(readFiniteNumber(-3.5)).toBe(-3.5);
    expect(readFiniteNumber(Number.NaN)).toBeNull();
    expect(readFiniteNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(readFiniteNumber("3")).toBeNull();
  });
});