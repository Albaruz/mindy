import { describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query";
import { invalidateGarmentCaches } from "./invalidateGarmentCaches";

describe("invalidateGarmentCaches", () => {
  it("invalidates inventory, favorites and history exactly once each", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    await invalidateGarmentCaches(queryClient);

    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.garments,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.favorites,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.history,
    });
  });
});
