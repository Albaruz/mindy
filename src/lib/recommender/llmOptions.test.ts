import { describe, expect, it } from "vitest";
import {
  classifyAiFallbackReason,
  enforceVarietyAcrossOptions,
  extractCompletedOptionObjects,
  filterValidOutfitOptions,
  isUpstreamFailure,
  parseCompletedOption,
  parseOptions,
} from "./llmOptions";
import type { CandidateGarment } from "./types";

function candidate(id: string, garmentType: string): CandidateGarment {
  return {
    id,
    garmentType: garmentType as CandidateGarment["garmentType"],
    color: "black",
    colorBase: null,
    material: "cotton",
    materialDetail: null,
    season: "all",
    style: "casual",
    styles: ["casual"],
    isDirty: false,
  };
}

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

  it.each([
    ["rate limit", false, "groq_rate_limited"],
    ["request timeout", false, "groq_timeout"],
    ["network connection failed", false, "groq_connection"],
    ["server unavailable", false, "groq_server_error", 503],
    ["empty completion", false, "empty_completion"],
    ["LLM response is invalid JSON", false, "invalid_json"],
    ["LLM response is invalid JSON", true, "repair_failed"],
    ["LLM response has no outfit options", false, "missing_options"],
    ["LLM options reference no known garment IDs", false, "unknown_garment_ids"],
    ["LLM options violate outfit constraints", false, "constraint_rejection"],
    ["unclassified provider failure", false, "upstream_unknown"],
  ])("classifies fallback reason: %s", (message, repaired, expected, status) => {
    const error = new Error(message);
    if (typeof status === "number") {
      (error as Error & { status?: number }).status = status;
    }
    expect(classifyAiFallbackReason(error, repaired)).toBe(expected);
  });

  it("recognizes upstream errors and rejects unrelated local errors", () => {
    expect(isUpstreamFailure(null)).toBe(false);
    expect(isUpstreamFailure({ __upstreamFailure: true })).toBe(true);
    expect(isUpstreamFailure({ status: 502 })).toBe(true);
    expect(isUpstreamFailure({ name: "RateLimitError" })).toBe(true);
    expect(isUpstreamFailure(new Error("Network fetch failed"))).toBe(true);
    expect(isUpstreamFailure(new Error("invalid local state"))).toBe(false);
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

  it("rejects duplicate IDs, missing locked IDs, incomplete looks, and missing required outerwear", () => {
    const candidates = [
      candidate("top", "top"),
      candidate("bottom", "bottom"),
      candidate("coat", "outerwear"),
    ];
    const lockedIds = new Set(["top"]);
    const invalidOptions = [
      { garmentIds: ["top", "top", "bottom"], suitabilityRatio: 90, reason: "" },
      { garmentIds: ["bottom", "coat"], suitabilityRatio: 80, reason: "" },
      { garmentIds: ["top", "coat"], suitabilityRatio: 70, reason: "" },
      { garmentIds: ["top", "bottom"], suitabilityRatio: 60, reason: "" },
    ];

    expect(filterValidOutfitOptions(invalidOptions, candidates, lockedIds, true)).toEqual([]);
    expect(
      filterValidOutfitOptions(
        [{ garmentIds: ["top", "bottom", "coat"], suitabilityRatio: 90, reason: "" }],
        candidates,
        lockedIds,
        true,
      ),
    ).toHaveLength(1);
  });

  it("allows one mid-layer together with one outerwear and rejects duplicates", () => {
    const candidates = [
      candidate("top", "top"),
      candidate("bottom", "bottom"),
      candidate("cardigan", "mid_layer"),
      candidate("coat", "outerwear"),
      candidate("vest", "mid_layer"),
    ];
    expect(
      filterValidOutfitOptions(
        [
          {
            garmentIds: ["top", "bottom", "cardigan", "coat"],
            suitabilityRatio: 90,
            reason: "Layered outfit",
          },
        ],
        candidates,
        new Set(),
        true,
      ),
    ).toHaveLength(1);
    expect(
      filterValidOutfitOptions(
        [
          {
            garmentIds: ["top", "bottom", "cardigan", "vest", "coat"],
            suitabilityRatio: 80,
            reason: "Too many mid-layers",
          },
        ],
        candidates,
        new Set(),
        false,
      ),
    ).toEqual([]);
  });

  it("keeps the best varied options and allows locked repeated garments", () => {
    const candidates = [
      candidate("top", "top"),
      candidate("top-2", "top"),
      candidate("bottom", "bottom"),
      candidate("bottom-2", "bottom"),
      candidate("shoes", "footwear"),
      candidate("coat", "outerwear"),
    ];
    const options = [
      { garmentIds: ["top", "bottom", "shoes", "coat"], suitabilityRatio: 90, reason: "Best" },
      { garmentIds: ["top", "bottom-2", "shoes", "coat"], suitabilityRatio: 80, reason: "Repeat top" },
      { garmentIds: ["top-2", "bottom-2", "shoes", "coat"], suitabilityRatio: 70, reason: "Varied" },
    ];

    expect(enforceVarietyAcrossOptions(options, candidates, new Set())).toHaveLength(2);
    expect(
      enforceVarietyAcrossOptions(options.slice(0, 2), candidates, new Set(["top"])),
    ).toHaveLength(2);
  });
});
