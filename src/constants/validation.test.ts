// Unit tests for input validation limits used by forms.
import { describe, expect, it } from "vitest";
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  EMAIL_PATTERN,
  IMAGE_DATA_URL_PREFIX,
  MEASUREMENT_MAX_CM,
  MEASUREMENT_MIN_CM,
  MAX_IMAGE_DATA_CHARS,
  PASSWORD_MIN_LENGTH,
  TAG_KEY_MAX_LENGTH,
  TAG_VALUE_MAX_LENGTH,
} from "./validation";

describe("validation constants", () => {
  it("exposes password and display name limits", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(6);
    expect(DISPLAY_NAME_MIN_LENGTH).toBe(2);
    expect(DISPLAY_NAME_MAX_LENGTH).toBe(40);
    expect(DISPLAY_NAME_MIN_LENGTH).toBeLessThan(DISPLAY_NAME_MAX_LENGTH);
  });

  it("validates email shapes", () => {
    expect(EMAIL_PATTERN.test("user@example.com")).toBe(true);
    expect(EMAIL_PATTERN.test("not-an-email")).toBe(false);
    expect(EMAIL_PATTERN.test("missing@tld")).toBe(false);
  });

  it("exposes tag limits", () => {
    expect(TAG_KEY_MAX_LENGTH).toBe(40);
    expect(TAG_VALUE_MAX_LENGTH).toBe(80);
    expect(TAG_VALUE_MAX_LENGTH).toBeGreaterThan(TAG_KEY_MAX_LENGTH);
  });

  it("exposes measurement limits used by profile forms", () => {
    expect(MEASUREMENT_MIN_CM).toBe(20);
    expect(MEASUREMENT_MAX_CM).toBe(300);
    expect(MEASUREMENT_MIN_CM).toBeLessThan(MEASUREMENT_MAX_CM);
  });

  it("exposes image upload guards", () => {
    expect(MAX_IMAGE_DATA_CHARS).toBe(7_000_000);
    expect(IMAGE_DATA_URL_PREFIX).toBe("data:image/");
  });
});
