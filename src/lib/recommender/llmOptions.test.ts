import { describe, expect, it } from "vitest";
import {
  classifyAiFallbackReason,
  extractCompletedOptionObjects,
  filterValidOutfitOptions,
  parseCompletedOption,
  parseOptions,
} from "./llmOptions";
import type { CandidateGarment } from "./types";

describe("recommender fallback telemetry", () => {
  it("classifies Groq JSON stream validation failures", () => {
    expect(
      classifyAiFallbackReason(
        new Error("Failed to validate JSON. See failed_generation for details."),
        false,
      ),
    ).toBe("stream_json_validation_failed");
  });

  it("classifies an invalid repaired response separately", () => {
    expect(
      classifyAiFallbackReason(new Error("LLM response is invalid JSON"), true),
    ).toBe("repair_failed");
  });
});

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

describe("recommender option constraints", () => {
  it("rejects a one-piece look that would hide a selected bottom garment", () => {
    const candidates: CandidateGarment[] = [
      {
        id: "dress",
        garmentType: "dress",
        color: "black",
        colorBase: null,
        material: "cotton",
        materialDetail: null,
        season: "all",
        style: "casual",
        styles: ["casual"],
        isDirty: false,
      },
      {
        id: "favorite-bottom",
        garmentType: "bottom",
        color: "black",
        colorBase: null,
        material: "cotton",
        materialDetail: null,
        season: "all",
        style: "casual",
        styles: ["casual"],
        isDirty: false,
      },
    ];

    expect(
      filterValidOutfitOptions(
        [
          {
            garmentIds: ["dress", "favorite-bottom"],
            suitabilityRatio: 80,
            reason: "",
          },
        ],
        candidates,
        new Set(["favorite-bottom"]),
        false,
      ),
    ).toEqual([]);
  });
});
