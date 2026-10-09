import { beforeEach, describe, expect, it } from "vitest";
import { useGeneratorStore } from "./useGeneratorStore";
import type { Garment } from "@/types/garment";

function buildGarment(id: string, type: Garment["garmentType"]): Garment {
  return {
    garmentId: id,
    userId: "u1",
    imageUrl: null,
    garmentType: type,
    style: "casual",
    cutLength: null,
    color: "black",
    material: "cotton",
    season: "all",
    isDirty: false,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "",
  };
}

describe("useGeneratorStore", () => {
  beforeEach(() => {
    useGeneratorStore.getState().resetFlow();
  });

  it("locks and unlocks a category around a garment", () => {
    const top = buildGarment("top-1", "top");
    useGeneratorStore.getState().toggleLockGarment("top", top);
    expect(useGeneratorStore.getState().getLockedGarmentIds().top).toBe(
      "top-1",
    );
    useGeneratorStore.getState().toggleLockGarment("top");
    expect(useGeneratorStore.getState().getLockedGarmentIds().top).toBeNull();
  });

  it("preserves locked slots on setFullLook", () => {
    const locked = buildGarment("locked-top", "top");
    const incoming = buildGarment("new-top", "top");
    useGeneratorStore.getState().toggleLockGarment("top", locked);
    useGeneratorStore.getState().setFullLook({ top: incoming });
    expect(useGeneratorStore.getState().slots.top.garment?.garmentId).toBe(
      "locked-top",
    );
  });

  it("tracks dismissed garments", () => {
    const current = buildGarment("current", "top");
    const replacement = buildGarment("next", "top");
    useGeneratorStore.getState().setGarment("top", current);
    useGeneratorStore.getState().dismissGarment("top", replacement);
    expect(useGeneratorStore.getState().dismissedIds).toContain("current");
    expect(
      useGeneratorStore.getState().slots.top.garment?.garmentId,
    ).toBe("next");
  });

  it("limits discard count and resets flow", () => {
    const store = useGeneratorStore.getState();
    store.setAiLooks([
      { id: "1", garments: [], reason: null, suitability: 80 },
      { id: "2", garments: [], reason: null, suitability: 70 },
    ]);
    for (let index = 0; index < 5; index += 1) {
      useGeneratorStore.getState().discardActiveLook();
    }
    expect(
      useGeneratorStore.getState().discardCount,
    ).toBeLessThanOrEqual(4);
    useGeneratorStore.getState().resetFlow();
    expect(useGeneratorStore.getState().aiLooks).toHaveLength(0);
    expect(useGeneratorStore.getState().view).toBe("zero");
  });
});
