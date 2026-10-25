import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@/constants/errors";
import { AppError } from "@/lib/errors";
import {
  formatRecommenderError,
  readRecommenderError,
  validateRecommenderResponse,
} from "./generatorResponse";

describe("recommender response helpers", () => {
  it("reads a non-empty server error message", async () => {
    await expect(
      readRecommenderError(Response.json({ error: "INSUFFICIENT_STYLE_GARMENTS" })),
    ).resolves.toBe("INSUFFICIENT_STYLE_GARMENTS");
  });

  it("returns null for empty, non-object, or malformed server payloads", async () => {
    await expect(readRecommenderError(Response.json({ error: "" }))).resolves.toBeNull();
    await expect(readRecommenderError(Response.json("failure"))).resolves.toBeNull();
    await expect(
      readRecommenderError(new Response("not-json", { status: 502 })),
    ).resolves.toBeNull();
  });

  it("maps only the known style error to the no-options code", () => {
    expect(
      formatRecommenderError(new Response(null, { status: 422 }), "INSUFFICIENT_STYLE_GARMENTS"),
    ).toEqual(new AppError(ERROR_CODES.NO_OPTIONS));
    expect(
      formatRecommenderError(new Response(null, { status: 502 }), "upstream detail"),
    ).toEqual(new AppError(ERROR_CODES.STYLIST_UNAVAILABLE));
  });

  it("validates that a response contains at least one option", () => {
    expect(validateRecommenderResponse(null)).toBe(false);
    expect(validateRecommenderResponse({ options: [] })).toBe(false);
    expect(validateRecommenderResponse({ options: [{}] })).toBe(true);
  });
});
