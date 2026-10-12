import { describe, expect, it } from "vitest";
import {
  InsufficientStyleGarmentsError,
  LOOK_STYLE_TO_MOOD,
  resolveClimate,
} from "./useGenerateLooks";

describe("LOOK_STYLE_TO_MOOD", () => {
  it("maps every look style to a mood", () => {
    expect(LOOK_STYLE_TO_MOOD.casual).toBe("relaxed");
    expect(LOOK_STYLE_TO_MOOD.formal).toBe("professional");
    expect(LOOK_STYLE_TO_MOOD.sport).toBe("active");
    expect(Object.keys(LOOK_STYLE_TO_MOOD)).toHaveLength(6);
  });
});

describe("InsufficientStyleGarmentsError", () => {
  it("carries the rejected style", () => {
    const error = new InsufficientStyleGarmentsError("formal");
    expect(error.style).toBe("formal");
    expect(error.message).toBe("INSUFFICIENT_STYLE_GARMENTS");
  });
});

describe("resolveClimate", () => {
  it("returns default climate without geolocation", async () => {
    const climate = await resolveClimate();
    expect(climate.temperatureC).toBe(20);
    expect(climate.condition).toBeNull();
  });
});
