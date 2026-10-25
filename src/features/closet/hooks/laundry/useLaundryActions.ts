"use client";

import { useEffect, useRef, useState } from "react";
import type { Garment } from "@/types/garment";
import { CELEBRATION_BURST_MS } from "@/constants/animations";
import { useDoLaundry } from "@/features/profile/hooks/laundry/useDoLaundry";
import { useWashGarment } from "./useWashGarment";

// Laundry actions of the closet: wash one garment (optimistic: the card
// shrinks away at once and a failure puts it back) and wash everything
// (celebration burst on success).
export function useLaundryActions() {
  const washGarment = useWashGarment();
  const doLaundry = useDoLaundry();
  const [washingGarmentIds, setWashingGarmentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [laundryBurstKey, setLaundryBurstKey] = useState(0);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the celebration burst timer on unmount.
  useEffect(
    () => () => {
      if (burstTimerRef.current !== null) {
        clearTimeout(burstTimerRef.current);
      }
    },
    [],
  );

  const wash = (garment: Garment) => {
    if (washingGarmentIds.has(garment.garmentId)) {
      return;
    }
    setWashingGarmentIds((current) => new Set(current).add(garment.garmentId));
    washGarment.mutate(garment.garmentId, {
      onError: () => {
        setWashingGarmentIds((current) => {
          const next = new Set(current);
          next.delete(garment.garmentId);
          return next;
        });
      },
    });
  };

  const washAll = () => {
    if (doLaundry.isPending) {
      return;
    }
    doLaundry.mutate(undefined, {
      onSuccess: () => {
        setLaundryBurstKey((key) => key + 1);
        if (burstTimerRef.current !== null) {
          clearTimeout(burstTimerRef.current);
        }
        burstTimerRef.current = setTimeout(
          () => setLaundryBurstKey(0),
          CELEBRATION_BURST_MS,
        );
      },
    });
  };

  return {
    washingGarmentIds,
    laundryBurstKey,
    isWashing: washGarment.isPending,
    isWashingAll: doLaundry.isPending,
    wash,
    washAll,
  };
}
