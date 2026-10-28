import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateGarment } from "./types";

const { mockRepairOutfitRecommendation } = vi.hoisted(() => ({
  mockRepairOutfitRecommendation: vi.fn(),
}));

vi.mock("@/lib/ai/engine", () => ({
  repairOutfitRecommendation: mockRepairOutfitRecommendation,
}));

import { repairModelOptionsIfNeeded } from "./modelOptions";

const CANDIDATES: CandidateGarment[] = [
  {
    id: "top-1",
    garmentType: "top",
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
    id: "bottom-1",
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

const CONTEXT = {
  knownIds: new Set(["top-1", "bottom-1"]),
  candidates: CANDIDATES,
  lockedIds: new Set<string>(),
  outerwearRequired: false,
  coldWeather: false,
};

describe("repairModelOptionsIfNeeded", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("repairs parsed options that violate outfit constraints", async () => {
    const userPayload = { candidates: CANDIDATES };
    const invalidContent = JSON.stringify({
      options: [{ garmentIds: ["top-1"], suitabilityRatio: 70, reason: "Incomplete" }],
    });
    mockRepairOutfitRecommendation.mockResolvedValueOnce(
      JSON.stringify({
        options: [
          {
            garmentIds: ["top-1", "bottom-1"],
            suitabilityRatio: 88,
            reason: "Repaired",
          },
        ],
      }),
    );
    const signal = new AbortController().signal;

    await expect(
      repairModelOptionsIfNeeded(userPayload, invalidContent, CONTEXT, signal),
    ).resolves.toEqual({
      options: [
        {
          garmentIds: ["top-1", "bottom-1"],
          suitabilityRatio: 88,
          reason: "Repaired",
        },
      ],
      attempted: true,
    });
    expect(mockRepairOutfitRecommendation).toHaveBeenCalledWith(
      userPayload,
      invalidContent,
      signal,
    );
  });
});
