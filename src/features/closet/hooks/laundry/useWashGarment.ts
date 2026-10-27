import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";
import type { Garment } from "@/types/garment";

interface WashContext {
  garments: Garment[] | undefined;
  basket: Garment[] | undefined;
}

// Washes one owned garment and optimistically removes it from dirty views.
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
    onMutate: async (garmentId): Promise<WashContext> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: QUERY_KEYS.garments }),
        queryClient.cancelQueries({ queryKey: QUERY_KEYS.laundryBasket }),
      ]);
      const context = {
        garments: queryClient.getQueryData<Garment[]>(QUERY_KEYS.garments),
        basket: queryClient.getQueryData<Garment[]>(QUERY_KEYS.laundryBasket),
      };
      queryClient.setQueryData<Garment[] | undefined>(
        QUERY_KEYS.garments,
        (current) =>
          current?.map((garment) =>
            garment.garmentId === garmentId
              ? { ...garment, isDirty: false }
              : garment,
          ),
      );
      queryClient.setQueryData<Garment[] | undefined>(
        QUERY_KEYS.laundryBasket,
        (current) => current?.filter((garment) => garment.garmentId !== garmentId),
      );
      return context;
    },
    onError: (_error, _garmentId, context) => {
      queryClient.setQueryData(QUERY_KEYS.garments, context?.garments);
      queryClient.setQueryData(QUERY_KEYS.laundryBasket, context?.basket);
      useNotificationStore
        .getState()
        .addNotification("error", t("laundryFailed"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.laundryBasket });
    },
  });
}
