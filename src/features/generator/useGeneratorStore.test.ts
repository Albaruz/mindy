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

describe("useGeneratorStore extended coverage", () => {
  beforeEach(() => {
    useGeneratorStore.getState().resetFlow();
  });

  it("preloads the active look into manual carousels", () => {
    const top = buildGarment("top-1", "top");
    const bottom = buildGarment("bottom-1", "bottom");
    useGeneratorStore.getState().setAiLooks([
      { id: "1", garments: [top, bottom], reason: null, suitability: 80 },
    ]);
    useGeneratorStore.getState().editActiveLookInManual();
    const state = useGeneratorStore.getState();
    expect(state.view).toBe("manual");
    expect(state.slots.top.garment?.garmentId).toBe("top-1");
    expect(state.slots.bottom.garment?.garmentId).toBe("bottom-1");
  });

  it("switches to manual without an active look", () => {
    useGeneratorStore.getState().editActiveLookInManual();
    expect(useGeneratorStore.getState().view).toBe("manual");
  });

  it("unlockAll keeps garments and clears suggestions", () => {
    const top = buildGarment("top-1", "top");
    useGeneratorStore.getState().setGarment("top", top);
    useGeneratorStore.getState().toggleLockGarment("top", top);
    useGeneratorStore
      .getState()
      .setCombineSuggestions({ top: ["top-1", "top-2"] });
    useGeneratorStore.getState().unlockAll();
    const state = useGeneratorStore.getState();
    expect(state.slots.top.garment?.garmentId).toBe("top-1");
    expect(state.slots.top.isLocked).toBe(false);
    expect(state.combineSuggestions).toEqual({});
  });

  it("getLockedGarments returns only locked slots with a garment", () => {
    const top = buildGarment("top-1", "top");
    useGeneratorStore.getState().toggleLockGarment("top", top);
    useGeneratorStore.getState().toggleLockGarment("bottom");
    const locked = useGeneratorStore.getState().getLockedGarments();
    expect(locked).toHaveLength(1);
    expect(locked[0].garmentId).toBe("top-1");
  });

  it("stores fallback garment ids", () => {
    useGeneratorStore.getState().setFallbackGarmentIds(["a", "b"]);
    expect(useGeneratorStore.getState().fallbackGarmentIds).toEqual([
      "a",
      "b",
    ]);
  });

  it("failStrictStyleFilter lands on showcase with the rejected style", () => {
    useGeneratorStore.getState().startLoading();
    useGeneratorStore.getState().failStrictStyleFilter("formal");
    const state = useGeneratorStore.getState();
    expect(state.insufficientStyle).toBe("formal");
    expect(state.view).toBe("showcase");
  });

  it("drives the view state machine", () => {
    const store = useGeneratorStore.getState();
    store.startManual();
    expect(useGeneratorStore.getState().view).toBe("manual");
    useGeneratorStore.getState().startAutoSelect();
    expect(useGeneratorStore.getState().view).toBe("auto-select");
    useGeneratorStore.getState().startLoading();
    expect(useGeneratorStore.getState().view).toBe("loading");
    useGeneratorStore.getState().setView("zero");
    expect(useGeneratorStore.getState().view).toBe("zero");
  });

  it("shows and dismisses the celebration payload", () => {
    const top = buildGarment("top-1", "top");
    useGeneratorStore.getState().showCelebration([top]);
    expect(
      useGeneratorStore.getState().celebrationGarments,
    ).toHaveLength(1);
    useGeneratorStore.getState().dismissCelebration();
    expect(useGeneratorStore.getState().celebrationGarments).toBeNull();
  });

  it("setLookStyle clears a previous insufficientStyle", () => {
    useGeneratorStore.getState().failStrictStyleFilter("formal");
    useGeneratorStore.getState().setLookStyle("casual");
    const state = useGeneratorStore.getState();
    expect(state.lookStyle).toBe("casual");
    expect(state.insufficientStyle).toBeNull();
  });

  it("setAiLooks resets counters and shows the showcase", () => {
    useGeneratorStore.getState().failStrictStyleFilter("formal");
    useGeneratorStore.getState().setAiLooks([
      { id: "1", garments: [], reason: null, suitability: 80 },
    ]);
    const state = useGeneratorStore.getState();
    expect(state.view).toBe("showcase");
    expect(state.activeLookIndex).toBe(0);
    expect(state.discardCount).toBe(0);
    expect(state.insufficientStyle).toBeNull();
  });

  it("clears streamed previews when final looks replace them", () => {
    const look = { id: "preview", garments: [], reason: null, suitability: 80 };
    useGeneratorStore.getState().startLoading();
    useGeneratorStore.getState().setStreamedLooks([look]);
    expect(useGeneratorStore.getState().streamedLooks).toEqual([look]);

    useGeneratorStore.getState().setAiLooks([look]);
    expect(useGeneratorStore.getState().streamedLooks).toEqual([]);
  });

  it("discardActiveLook is a no-op at the rejection limit", () => {
    useGeneratorStore.getState().setAiLooks([
      { id: "1", garments: [], reason: null, suitability: 80 },
      { id: "2", garments: [], reason: null, suitability: 70 },
      { id: "3", garments: [], reason: null, suitability: 60 },
      { id: "4", garments: [], reason: null, suitability: 50 },
      { id: "5", garments: [], reason: null, suitability: 40 },
    ]);
    for (let index = 0; index < 4; index += 1) {
      useGeneratorStore.getState().discardActiveLook();
    }
    const before = useGeneratorStore.getState().aiLooks.length;
    useGeneratorStore.getState().discardActiveLook();
    expect(useGeneratorStore.getState().discardCount).toBe(4);
    expect(useGeneratorStore.getState().aiLooks).toHaveLength(before);
  });

  it("discardActiveLook removes the active look and counts up", () => {
    useGeneratorStore.getState().setAiLooks([
      { id: "1", garments: [], reason: null, suitability: 80 },
      { id: "2", garments: [], reason: null, suitability: 70 },
    ]);
    useGeneratorStore.getState().discardActiveLook();
    const state = useGeneratorStore.getState();
    expect(state.aiLooks.map((look) => look.id)).toEqual(["2"]);
    expect(state.activeLookIndex).toBe(0);
    expect(state.discardCount).toBe(1);
  });

  it("resetCanvas clears slots and helper state", () => {
    const top = buildGarment("top-1", "top");
    useGeneratorStore.getState().setGarment("top", top);
    useGeneratorStore.getState().dismissGarment("top", buildGarment("t2", "top"));
    useGeneratorStore.getState().setFallbackGarmentIds(["x"]);
    useGeneratorStore
      .getState()
      .setCombineSuggestions({ top: ["top-1"] });
    useGeneratorStore.getState().resetCanvas();
    const state = useGeneratorStore.getState();
    expect(state.slots.top.garment).toBeNull();
    expect(state.dismissedIds).toEqual([]);
    expect(state.fallbackGarmentIds).toEqual([]);
    expect(state.combineSuggestions).toEqual({});
  });

  it("setGarment replaces the slot garment", () => {
    useGeneratorStore.getState().setGarment("top", buildGarment("a", "top"));
    useGeneratorStore.getState().setGarment("top", buildGarment("b", "top"));
    expect(
      useGeneratorStore.getState().slots.top.garment?.garmentId,
    ).toBe("b");
  });

  it("getLockedGarmentIds reports all four slots", () => {
    const ids = useGeneratorStore.getState().getLockedGarmentIds();
    expect(ids).toEqual({
      top: null,
      bottom: null,
      footwear: null,
      outerwear: null,
    });
    (
      ["top", "bottom", "footwear", "outerwear"] as const
    ).forEach((category) => {
      useGeneratorStore
        .getState()
        .toggleLockGarment(category, buildGarment(`${category}-1`, category));
    });
    expect(useGeneratorStore.getState().getLockedGarmentIds()).toEqual({
      top: "top-1",
      bottom: "bottom-1",
      footwear: "footwear-1",
      outerwear: "outerwear-1",
    });
    useGeneratorStore.getState().toggleLockGarment("top");
    expect(
      useGeneratorStore.getState().getLockedGarmentIds().top,
    ).toBeNull();
  });
});

describe("useGeneratorStore residual coverage", () => {
  beforeEach(() => {
    useGeneratorStore.getState().resetFlow();
  });

  it("toggles a lock around the current slot garment", () => {
    useGeneratorStore.getState().setGarment("top", buildGarment("t1", "top"));
    useGeneratorStore.getState().toggleLock("top");
    expect(useGeneratorStore.getState().slots.top.isLocked).toBe(true);
    useGeneratorStore.getState().toggleLock("top");
    expect(useGeneratorStore.getState().slots.top.isLocked).toBe(false);
    expect(
      useGeneratorStore.getState().slots.top.garment?.garmentId,
    ).toBe("t1");
  });

  it("reports null ids for locks without a garment", () => {
    (
      ["top", "bottom", "footwear", "outerwear"] as const
    ).forEach((category) => {
      useGeneratorStore.getState().toggleLockGarment(category);
    });
    expect(useGeneratorStore.getState().getLockedGarmentIds()).toEqual({
      top: null,
      bottom: null,
      footwear: null,
      outerwear: null,
    });
  });

  it("dismissGarment on an empty slot keeps dismissedIds unchanged", () => {
    useGeneratorStore
      .getState()
      .dismissGarment("top", buildGarment("next", "top"));
    const state = useGeneratorStore.getState();
    expect(state.dismissedIds).toEqual([]);
    expect(state.slots.top.garment?.garmentId).toBe("next");
  });
});
