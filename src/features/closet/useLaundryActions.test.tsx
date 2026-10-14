import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Garment } from "@/types/garment";
import { CELEBRATION_BURST_MS } from "@/constants/animations";
import { useLaundryActions } from "./useLaundryActions";

const washMutate = vi.fn();
const laundryMutate = vi.fn();
let laundryPending = false;
vi.mock("./useWashGarment", () => ({
  useWashGarment: () => ({ mutate: washMutate, isPending: false }),
}));
vi.mock("@/features/profile/useDoLaundry", () => ({
  useDoLaundry: () => ({ mutate: laundryMutate, isPending: laundryPending }),
}));

const GARMENT = { garmentId: "g1" } as Garment;

describe("useLaundryActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    washMutate.mockReset();
    laundryMutate.mockReset();
    laundryPending = false;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("hides a garment optimistically and puts it back when the wash fails", () => {
    const { result } = renderHook(() => useLaundryActions());
    act(() => result.current.wash(GARMENT));
    expect(result.current.washingGarmentIds.has("g1")).toBe(true);

    act(() => result.current.wash(GARMENT));
    expect(washMutate).toHaveBeenCalledTimes(1);

    act(() => washMutate.mock.calls[0][1].onError());
    expect(result.current.washingGarmentIds.has("g1")).toBe(false);
  });

  it("celebrates a full wash and clears the burst after its duration", () => {
    const { result } = renderHook(() => useLaundryActions());
    act(() => result.current.washAll());
    act(() => laundryMutate.mock.calls[0][1].onSuccess());
    expect(result.current.laundryBurstKey).toBe(1);

    act(() => laundryMutate.mock.calls[0][1].onSuccess());
    expect(result.current.laundryBurstKey).toBe(2);

    act(() => {
      vi.advanceTimersByTime(CELEBRATION_BURST_MS);
    });
    expect(result.current.laundryBurstKey).toBe(0);
  });

  it("does not start a second wash-all while one is pending", () => {
    laundryPending = true;
    const { result, unmount } = renderHook(() => useLaundryActions());
    act(() => result.current.washAll());
    expect(laundryMutate).not.toHaveBeenCalled();
    expect(result.current.isWashingAll).toBe(true);
    unmount();
  });

  it("clears a pending burst timer on unmount", () => {
    const { result, unmount } = renderHook(() => useLaundryActions());
    act(() => result.current.washAll());
    act(() => laundryMutate.mock.calls[0][1].onSuccess());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});