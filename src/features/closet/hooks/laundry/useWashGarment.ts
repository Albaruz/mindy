import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";

// Washes a single garment (is_dirty = false). The basket card animates
// away optimistically at the call site; queries revalidate afterwards.
export function useWashGarment() {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation({
    mutationFn: async (garmentId: string): Promise<void> => {
      const supabase = createClient();
      const user = await requireUser(supabase, "You must be signed in to wash garments.");

      const { error } = await supabase
        .from(TABLES.garments)
        .update({ is_dirty: false })
        .eq("garment_id", garmentId)
        .eq(USER_ID_COLUMN, user.id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.laundryBasket });
    },
    onError: () => {
      useNotificationStore
        .getState()
        .addNotification("error", t("laundryFailed"));
    },
  });
}
