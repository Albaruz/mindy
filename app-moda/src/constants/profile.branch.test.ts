// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  eyeColorToCssVar,
  getColorFromCssVar,
  getSeasonSwatches,
  hairColorToCssVar,
  seasonToCssVars,
  skinToneToCssVar,
} from "./profile";

describe("profile constants branch coverage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps enum values to css variable names", () => {
    expect(skinToneToCssVar("fair")).toBe("--skin-fair");
    expect(eyeColorToCssVar("blue")).toBe("--eye-blue");
    expect(hairColorToCssVar("black")).toBe("--hair-black");
    expect(seasonToCssVars("spring")).toEqual([
      "--season-spring-1",
      "--season-spring-2",
      "--season-spring-3",
      "--season-spring-4",
      "--season-spring-5",
    ]);
  });

  it("returns empty results without a browser window", () => {
    expect(getColorFromCssVar("--skin-fair")).toBe("");
    expect(getSeasonSwatches("winter")).toEqual([]);
  });

  it("reads computed colors when a window is available", () => {
    vi.stubGlobal(
      "window",
      {},
    );
    vi.stubGlobal("document", { documentElement: {} });
    vi.stubGlobal("getComputedStyle", () => ({
      getPropertyValue: (name: string) => `  ${name}-value  `,
    }));
    expect(getColorFromCssVar("--skin-fair")).toBe("--skin-fair-value");
    expect(getSeasonSwatches("summer")).toEqual([
      "--season-summer-1-value",
      "--season-summer-2-value",
      "--season-summer-3-value",
      "--season-summer-4-value",
      "--season-summer-5-value",
    ]);
  });
});
