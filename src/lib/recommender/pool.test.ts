import { describe, expect, it } from "vitest";
import { capBalancedPool } from "./pool";
import type { CandidateGarment } from "./types";

function candidate(id: string, garmentType: CandidateGarment["garmentType"]): CandidateGarment {
  return {
    id,
    garmentType,
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

describe("capBalancedPool", () => {
  it("returns small pools unchanged", () => {
    const pool = [candidate("top", "top"), candidate("bottom", "bottom")];
    expect(capBalancedPool(pool, new Set())).toBe(pool);
  });

  it("keeps priority candidates and locked candidates ahead of the balanced pool", () => {
    const locked = candidate("locked-top", "top");
    const priority = candidate("favorite-top", "top");
    const pool = [
      locked,
      priority,
      ...Array.from({ length: 30 }, (_, index) =>
        candidate(`top-${index}`, "top"),
      ),
      ...Array.from({ length: 10 }, (_, index) =>
        candidate(`bottom-${index}`, "bottom"),
      ),
    ];

    const capped = capBalancedPool(
      pool,
      new Set([locked.id]),
      new Set([priority.id]),
    );

    expect(capped).toHaveLength(25);
    expect(capped[0]?.id).toBe(locked.id);
    expect(capped[1]?.id).toBe(priority.id);
  });

  it("overflows the per-category soft cap when the remaining pool is still large", () => {
    const pool = Array.from({ length: 30 }, (_, index) =>
      candidate(`unknown-${index}`, null),
    );

    const capped = capBalancedPool(pool, new Set(), new Set(["unknown-0"]));

    expect(capped).toHaveLength(25);
    expect(capped.map((item) => item.id)).toEqual(
      pool.slice(0, 25).map((item) => item.id),
    );
  });

  it("fills the budget even when priority candidates exceed a category soft cap", () => {
    const priority = Array.from({ length: 16 }, (_, index) =>
      candidate(`favorite-top-${index}`, "top"),
    );
    const pool = [
      ...priority,
      ...Array.from({ length: 10 }, (_, index) =>
        candidate(`top-${index}`, "top"),
      ),
      ...Array.from({ length: 20 }, (_, index) =>
        candidate(`bottom-${index}`, "bottom"),
      ),
    ];

    const capped = capBalancedPool(
      pool,
      new Set(),
      new Set(priority.map((item) => item.id)),
    );

    expect(capped).toHaveLength(25);
    expect(capped.slice(0, 16).map((item) => item.id)).toEqual(
      priority.map((item) => item.id),
    );
    expect(capped.some((item) => item.id === "bottom-0")).toBe(true);
  });
});
