import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useGeneratorStore } from "../../state/generator-store/useGeneratorStore";
import {
  isWashableGarment,
  withoutHiddenBottom,
} from "@/lib/garment/categorizeGarments";
import type { Garment } from "@/types/garment";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";

// Persists the current canvas as today's look: inserts an outfit_history row
// with the full look (footwear and both layers included) but only marks
// washable garments as dirty. Shoes and heavy outerwear are reusable.
export function useWearToday() {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation({
    mutationFn: async (garments: Garment[]): Promise<Garment[]> => {
      // A dress/mono selection never drags a stale bottom along (e.g. a
      // hidden manual slot): sanitize before persisting or celebrating.
      const wornGarments = withoutHiddenBottom(garments);
      const supabase = createClient();
      const user = await requireUser(supabase, "You must be signed in to save a look.");

      const garmentIds = wornGarments.map((garment) => garment.garmentId);
      const now = new Date().toISOString();

      const { error: historyError } = await supabase
        .from(TABLES.outfitHistory)
        .insert({
          user_id: user.id,
          garment_ids: garmentIds,
          worn_date: now,
        });
      if (historyError) {
        throw historyError;
      }

      // Only footwear and heavy outerwear are reusable; mid-layers are washable.
      const dirtyIds = wornGarments
        .filter(isWashableGarment)
        .map((garment) => garment.garmentId);
      if (dirtyIds.length > 0) {
        const { error: garmentsError } = await supabase
          .from(TABLES.garments)
          .update({ is_dirty: true, last_worn_date: now })
          .in("garment_id", dirtyIds)
          .eq(USER_ID_COLUMN, user.id);
        if (garmentsError) {
          throw garmentsError;
        }
      }
      return wornGarments;
    },
    onSuccess: (garments) => {
      // The calendar reads outfit_history through QUERY_KEYS.history: without
      // invalidating it the new look only appears after a manual reload.
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.history });
      // The full-screen celebration replaces the success toast.
      useGeneratorStore.getState().showCelebration(garments);
    },
    onError: (error) => {
      useNotificationStore.getState().addNotification(
        "error",
        error instanceof Error ? error.message : t("wearFailed"),
      );
    },
  });
}
