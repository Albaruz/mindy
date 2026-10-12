import { describe, expect, it } from "vitest";
import { expandSearchQuery } from "./taxonomy";

describe("expandSearchQuery branch coverage", () => {
  it("passes unknown tokens through unchanged", () => {
    expect(expandSearchQuery("xyzunknown")).toEqual([["xyzunknown"]]);
  });

  it("mixes known expansions with unknown tokens", () => {
    const expansions = expandSearchQuery("pantalon xyzunknown");
    expect(expansions).toHaveLength(2);
    expect(expansions[0]).toContain("pants");
    expect(expansions[1]).toEqual(["xyzunknown"]);
  });

  it("handles a trailing unknown token after a multi-word phrase", () => {
    const expansions = expandSearchQuery("parte de abajo xyzunknown");
    expect(expansions[expansions.length - 1]).toEqual(["xyzunknown"]);
  });
});
