import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GARMENTS_QUERY_KEY } from "@/features/closet/useClosetQuery";
import { HISTORY_QUERY_KEY } from "@/features/history/useHistoryQuery";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import { useGeneratorStore } from "./useGeneratorStore";
import {
  isLaundryExemptGarment,
  withoutHiddenBottom,
} from "./categorizeGarments";
import type { Garment } from "@/types/garment";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";

// Persists the current canvas as today's look: inserts an outfit_history row
// with the full look (footwear and outerwear included) but only marks tops
// and bottoms as dirty. Shoes and outerwear are reusable across wears.
export function useWearToday() {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation({
    mutationFn: async (garments: Garment[]): Promise<Garment[]> => {
      // A dress/mono selection never drags a stale bottom along (e.g. a
      // hidden manual slot): sanitize before persisting or celebrating.
      const wornGarments = withoutHiddenBottom(garments);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be signed in to save a look.");
      }

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

      // Reusable garments (footwear, outerwear) never count as dirty.
      const dirtyIds = wornGarments
        .filter((garment) => !isLaundryExemptGarment(garment))
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
      // The calendar reads outfit_history through HISTORY_QUERY_KEY: without
      // invalidating it the new look only appears after a manual reload.
      void queryClient.invalidateQueries({ queryKey: GARMENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
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
