import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Garment } from "@/types/garment";
import { useGarmentDeletion } from "./useGarmentDeletion";

const mutate = vi.fn();
let isPending = false;
vi.mock("./useDeleteGarment", () => ({
  useDeleteGarment: () => ({ mutate, isPending }),
}));

const GARMENT = {
  garmentId: "g1",
  imageUrl: "https://x/y.png",
} as Garment;

describe("useGarmentDeletion", () => {
  beforeEach(() => {
    mutate.mockReset();
    isPending = false;
  });

  it("asks for confirmation before deleting and can be cancelled", () => {
    const { result } = renderHook(() => useGarmentDeletion());
    act(() => result.current.requestDelete(GARMENT));
    expect(result.current.pendingDelete).toBe(GARMENT);
    expect(mutate).not.toHaveBeenCalled();

    act(() => result.current.cancelDelete());
    expect(result.current.pendingDelete).toBeNull();
  });

  it("deletes the confirmed garment and clears state once settled", () => {
    const { result } = renderHook(() => useGarmentDeletion());
    act(() => result.current.requestDelete(GARMENT));
    act(() => result.current.confirmDelete());
    expect(mutate).toHaveBeenCalledWith(
      { garmentId: "g1", imageUrl: "https://x/y.png" },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
    expect(result.current.deletingGarmentId).toBe("g1");

    act(() => mutate.mock.calls[0][1].onSettled());
    expect(result.current.deletingGarmentId).toBeNull();
    expect(result.current.pendingDelete).toBeNull();
  });

  it("ignores confirm without a target and requests while a delete is pending", () => {
    const { result } = renderHook(() => useGarmentDeletion());
    act(() => result.current.confirmDelete());
    expect(mutate).not.toHaveBeenCalled();

    isPending = true;
    const busy = renderHook(() => useGarmentDeletion());
    act(() => busy.result.current.requestDelete(GARMENT));
    expect(busy.result.current.pendingDelete).toBeNull();
    expect(busy.result.current.isDeleting).toBe(true);
  });
});