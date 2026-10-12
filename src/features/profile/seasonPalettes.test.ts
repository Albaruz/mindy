import { describe, expect, it } from "vitest";
import { SEASON_PALETTES } from "./seasonPalettes";

describe("seasonPalettes", () => {
  it("exposes four seasonal palettes", () => {
    expect(Object.keys(SEASON_PALETTES).sort()).toEqual([
      "autumn",
      "spring",
      "summer",
      "winter",
    ]);
  });

  it("holds five hex swatches per season", () => {
    for (const swatches of Object.values(SEASON_PALETTES)) {
      expect(swatches).toHaveLength(5);
      for (const swatch of swatches) {
        expect(swatch).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });
});
