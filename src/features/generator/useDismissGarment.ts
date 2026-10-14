import { createClient } from "@/lib/supabase/client";
import type { Garment } from "@/types/garment";
import { TABLES } from "@/constants/storage";
import { getSessionUser } from "@/lib/supabase/session";
import {
  useGeneratorStore,
  type Category,
} from "./useGeneratorStore";

// Negative feedback ("change garment"): swaps the slot for another garment
// of the same category and records the dismissal. The swap applies
// immediately (session learning); the database row persists the signal for
// future training. A missing feedback table never blocks the swap.
export function useDismissGarment() {
  const dismissGarment = useGeneratorStore((state) => state.dismissGarment);

  return async (category: Category, pool: Garment[]): Promise<void> => {
    const { slots } = useGeneratorStore.getState();
    const current = slots[category].garment;
    const alternatives = pool.filter(
      (garment) => garment.garmentId !== current?.garmentId,
    );
    if (alternatives.length === 0) {
      return;
    }
    const replacement =
      alternatives[Math.floor(Math.random() * alternatives.length)];

    if (current) {
      try {
        // Training amnesia: garments suggested by the local fallback
        // never feed the AI. The session swap below still applies.
        const { fallbackGarmentIds } = useGeneratorStore.getState();
        if (!fallbackGarmentIds.includes(current.garmentId)) {
          const supabase = createClient();
          const user = await getSessionUser(supabase);
          if (user) {
            const { error } = await supabase.from(TABLES.garmentFeedback).insert({
              user_id: user.id,
              garment_id: current.garmentId,
              signal: "dismissed",
            });
            if (error) {
              throw error;
            }
          }
        }
      } catch {
        // Session-level learning still applies below.
      }
    }

    dismissGarment(category, replacement);
  };
}
