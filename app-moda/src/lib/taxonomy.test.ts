import { describe, expect, it } from "vitest";
import { expandSearchQuery, normalizeSearchText } from "./taxonomy";

describe("normalizeSearchText", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeSearchText("Pantalón  LINO")).toBe("pantalon lino");
  });
});

describe("expandSearchQuery", () => {
  it("returns empty array for blank queries", () => {
    expect(expandSearchQuery("   ")).toEqual([]);
  });

  it("expands spanish terms to equivalents", () => {
    const expansions = expandSearchQuery("pantalon");
    expect(expansions).toHaveLength(1);
    expect(expansions[0]).toContain("pants");
  });

  it("matches multi-word phrases greedily", () => {
    const expansions = expandSearchQuery("parte de abajo lino");
    expect(expansions.length).toBeGreaterThanOrEqual(2);
    expect(expansions[0]).toContain("bottom");
  });
});
