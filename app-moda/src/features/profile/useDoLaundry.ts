import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GARMENTS_QUERY_KEY } from "@/features/closet/useClosetQuery";
import { useNotificationStore } from "@/features/ui/useNotificationStore";
import { LAUNDRY_QUERY_KEY } from "./useLaundryBasketQuery";

// Marks every dirty garment of the current user as clean, emptying the
// laundry basket. Closet and basket queries revalidate afterwards.
export function useDoLaundry() {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be signed in to do the laundry.");
      }

      const { error } = await supabase
        .from("garments")
        .update({ is_dirty: false })
        .eq("user_id", user.id)
        .eq("is_dirty", true);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LAUNDRY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: GARMENTS_QUERY_KEY });
    },
    onError: () => {
      useNotificationStore
        .getState()
        .addNotification("error", t("laundryFailed"));
    },
  });
}
