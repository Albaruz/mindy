import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";
import type { Garment } from "@/types/garment";

interface LaundryContext {
  garments: Garment[] | undefined;
  basket: Garment[] | undefined;
}

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
    // Remove dirty garments immediately. This avoids leaving the basket
    // visible while an invalidation/refetch is delayed by a production
    // network or a persisted query cache.
    onMutate: async (): Promise<LaundryContext> => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.garments });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.laundryBasket });
      const context: LaundryContext = {
        garments: queryClient.getQueryData<Garment[]>(QUERY_KEYS.garments),
        basket: queryClient.getQueryData<Garment[]>(QUERY_KEYS.laundryBasket),
      };
      queryClient.setQueryData<Garment[] | undefined>(
        QUERY_KEYS.garments,
        (current) => current?.map((garment) => ({ ...garment, isDirty: false })),
      );
      queryClient.setQueryData<Garment[]>(QUERY_KEYS.laundryBasket, []);
      return context;
    },
    // One invalidation pass covers both success and failure; the error path
    // restores the optimistic snapshot before re-reading the server state.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.laundryBasket });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(QUERY_KEYS.garments, context?.garments);
      queryClient.setQueryData(QUERY_KEYS.laundryBasket, context?.basket);
      useNotificationStore
        .getState()
        .addNotification("error", t("laundryFailed"));
    },
  });
}
