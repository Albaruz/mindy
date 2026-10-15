import { describe, expect, it } from "vitest";
import {
  extractCompletedOptionObjects,
  parseCompletedOption,
  parseOptions,
} from "./llmOptions";

describe("streamed recommender option parsing", () => {
  it("extracts only complete option objects and handles braces in strings", () => {
    const partial =
      '{"options":[{"garmentIds":["top-1","bottom-1"],"reason":"A {great} look"}, {"garmentIds":["top-2"';

    expect(extractCompletedOptionObjects(partial)).toEqual([
      '{"garmentIds":["top-1","bottom-1"],"reason":"A {great} look"}',
    ]);
  });

  it("normalizes a completed option and filters unknown garment IDs", () => {
    const option = parseCompletedOption(
      '{"garmentIds":["top-1","unknown"],"suitabilityRatio":120,"reason":"Works"}',
      new Set(["top-1"]),
    );

    expect(option).toEqual({
      garmentIds: ["top-1"],
      suitabilityRatio: 100,
      reason: "Works",
    });
  });

  it("keeps the final response parser contract", () => {
    expect(
      parseOptions(
        '{"options":[{"garmentIds":["top-1","bottom-1"],"reason":"Ready"}]}',
        new Set(["top-1", "bottom-1"]),
      ),
    ).toEqual([
      {
        garmentIds: ["top-1", "bottom-1"],
        suitabilityRatio: 0,
        reason: "Ready",
      },
    ]);
  });
});
