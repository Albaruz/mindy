import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Garment } from "@/types/garment";
import { useClosetInventory } from "./useClosetInventory";

function garment(overrides: Partial<Garment>): Garment {
  return {
    garmentId: "g",
    userId: "u",
    imageUrl: null,
    garmentType: "top",
    style: null,
    cutLength: null,
    color: "black",
    material: null,
    season: null,
    isDirty: false,
    lastWornDate: null,
    isExternalGarment: false,
    extraTags: {},
    createdAt: "",
    ...overrides,
  };
}

const CLEAN_TOP = garment({ garmentId: "clean-top" });
const DIRTY_TOP = garment({ garmentId: "dirty-top", isDirty: true });
const DIRTY_SHOES = garment({
  garmentId: "dirty-shoes",
  garmentType: "footwear",
  isDirty: true,
});

describe("useClosetInventory", () => {
  it("splits clean and laundry garments; exempt categories stay wearable", () => {
    const { result } = renderHook(() =>
      useClosetInventory([CLEAN_TOP, DIRTY_TOP, DIRTY_SHOES]),
    );
    expect(result.current.cleanGarments.map((g) => g.garmentId)).toEqual([
      "clean-top",
      "dirty-shoes",
    ]);
    expect(result.current.dirtyGarments.map((g) => g.garmentId)).toEqual([
      "dirty-top",
    ]);
    expect(result.current.emptyMessageKey).toBeNull();
    expect(result.current.total).toBe(2);
  });

  it("switches to the laundry view", () => {
    const { result } = renderHook(() =>
      useClosetInventory([CLEAN_TOP, DIRTY_TOP]),
    );
    act(() => result.current.setInventoryView("dirty"));
    expect(result.current.filteredGarments.map((g) => g.garmentId)).toEqual([
      "dirty-top",
    ]);
  });

  it("filters by category and reports no results", () => {
    const { result } = renderHook(() => useClosetInventory([CLEAN_TOP]));
    act(() => result.current.setActiveCategory("shoes"));
    expect(result.current.hasQuery).toBe(true);
    expect(result.current.filteredGarments).toEqual([]);
    expect(result.current.emptyMessageKey).toBe("noResults");
  });

  it("distinguishes an empty closet from an empty basket", () => {
    const empty = renderHook(() => useClosetInventory([]));
    expect(empty.result.current.isActuallyEmpty).toBe(true);
    expect(empty.result.current.emptyMessageKey).toBe("closetEmpty");

    const basket = renderHook(() => useClosetInventory([CLEAN_TOP]));
    act(() => basket.result.current.setInventoryView("dirty"));
    expect(basket.result.current.emptyMessageKey).toBe("basketEmpty");
  });

  it("flags the laundry state when every washable garment is dirty", () => {
    const { result } = renderHook(() => useClosetInventory([DIRTY_TOP]));
    expect(result.current.shouldShowLaundryState).toBe(true);
    expect(result.current.emptyMessageKey).toBe("closetAllDirty");
  });

  it("reports a clean view without items when only exempt garments are dirty", () => {
    const hat = garment({ garmentId: "hat", garmentType: "outerwear" });
    const { result } = renderHook(() => useClosetInventory([hat]));
    act(() => result.current.setActiveCategory("all"));
    expect(result.current.shouldShowLaundryState).toBe(false);
    expect(result.current.emptyMessageKey).toBeNull();
  });
});