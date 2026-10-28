import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useGeneratorStore } from "../../state/generator-store/useGeneratorStore";
import {
  isWashableGarment,
  withoutHiddenBottom,
} from "@/lib/garment/categorizeGarments";
import type { Garment } from "@/types/garment";
import { requireUser } from "@/lib/supabase/session";
import { invalidateGarmentCaches } from "@/lib/garment/invalidateGarmentCaches";
import { ERROR_CODES } from "@/constants/errors";
import { AppError, isAppError } from "@/lib/errors";

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
      await requireUser(supabase);

      const garmentIds = wornGarments.map((garment) => garment.garmentId);
      const now = new Date().toISOString();

      // Only footwear and heavy outerwear are reusable; mid-layers are washable.
      const dirtyIds = wornGarments
        .filter(isWashableGarment)
        .map((garment) => garment.garmentId);
      const { error } = await supabase.rpc("record_worn_outfit", {
        p_garment_ids: garmentIds,
        p_dirty_ids: dirtyIds,
        p_worn_date: now,
      });
      if (error) {
        throw new AppError(ERROR_CODES.WEAR_SAVE_FAILED);
      }
      return wornGarments;
    },
    onSuccess: (garments) => {
      // Refresh garment, favorite, and calendar views after writing the look.
      const invalidation = invalidateGarmentCaches(queryClient);
      // The full-screen celebration replaces the success toast.
      useGeneratorStore.getState().showCelebration(garments);
      return invalidation;
    },
    onError: (error) => {
      useNotificationStore.getState().addNotification(
        "error",
        isAppError(error) ? t(`errors.${error.code}`) : t("wearFailed"),
      );
    },
  });
}
