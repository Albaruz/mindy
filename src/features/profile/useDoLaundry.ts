import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";

// Marks every dirty garment of the current user as clean, emptying the
// laundry basket. Closet and basket queries revalidate afterwards.
export function useDoLaundry() {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const supabase = createClient();
      const user = await requireUser(supabase, "You must be signed in to do the laundry.");

      const { error } = await supabase
        .from(TABLES.garments)
        .update({ is_dirty: false })
        .eq(USER_ID_COLUMN, user.id)
        .eq("is_dirty", true);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.laundryBasket });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
    },
    onError: () => {
      useNotificationStore
        .getState()
        .addNotification("error", t("laundryFailed"));
    },
  });
}
