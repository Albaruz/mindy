import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { requireUser } from "@/lib/supabase/session";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useGeneratorStore } from "./useGeneratorStore";
import { QUERY_KEYS } from "@/constants/query";
import { TABLES } from "@/constants/storage";
import { withoutHiddenBottom } from "@/lib/garment/categorizeGarments";
import type { Garment } from "@/types/garment";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function tomorrowDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
}

// Saves one planned outfit for tomorrow. The database unique key on
// (user_id, planned_date) makes a later save replace the previous choice.
export function usePlanTomorrow() {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation({
    mutationFn: async (garments: Garment[]): Promise<Garment[]> => {
      const plannedGarments = withoutHiddenBottom(garments);
      const supabase = createClient();
      const user = await requireUser(
        supabase,
        "You must be signed in to plan a look.",
      );
      const tomorrow = tomorrowDate();
      tomorrow.setHours(12, 0, 0, 0);

      const { error } = await supabase.from(TABLES.outfitHistory).upsert(
        {
          user_id: user.id,
          garment_ids: plannedGarments.map((garment) => garment.garmentId),
          worn_date: tomorrow.toISOString(),
          is_planned: true,
          planned_date: localDateKey(tomorrow),
        },
        { onConflict: "user_id,planned_date" },
      );
      if (error) {
        throw error;
      }
      return plannedGarments;
    },
    onSuccess: (garments) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.history });
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
