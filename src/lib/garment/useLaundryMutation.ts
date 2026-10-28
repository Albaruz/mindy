"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { QUERY_KEYS } from "@/constants/query";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { createClient } from "@/lib/supabase/client";
import { requireUser } from "@/lib/supabase/session";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Garment } from "@/types/garment";

interface LaundryContext {
  garments: Garment[] | undefined;
}

async function washOwnedGarments(garmentIds?: string[]): Promise<void> {
  const supabase = createClient();
  const user = await requireUser(supabase, "You must be signed in to do the laundry.");
  const update = supabase
    .from(TABLES.garments)
    .update({ is_dirty: false })
    .eq(USER_ID_COLUMN, user.id)
    .eq("is_dirty", true);
  const { error } =
    garmentIds === undefined
      ? await update
      : await update.in("garment_id", garmentIds);
  if (error) {
    throw error;
  }
}

function useLaundryMutation<TVariables>(
  getGarmentIds: (variables: TVariables) => string[] | undefined,
  mutationFn: (variables: TVariables) => Promise<void>,
): UseMutationResult<void, Error, TVariables, LaundryContext> {
  const queryClient = useQueryClient();
  const t = useTranslations("Notifications");

  return useMutation<void, Error, TVariables, LaundryContext>({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.garments });
      const context: LaundryContext = {
        garments: queryClient.getQueryData<Garment[]>(QUERY_KEYS.garments),
      };
      const garmentIds = getGarmentIds(variables);
      const selectedIds =
        garmentIds === undefined ? null : new Set(garmentIds);
      queryClient.setQueryData<Garment[] | undefined>(
        QUERY_KEYS.garments,
        (current) =>
          current?.map((garment) =>
            selectedIds === null || selectedIds.has(garment.garmentId)
              ? { ...garment, isDirty: false }
              : garment,
          ),
      );
      return context;
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(QUERY_KEYS.garments, context?.garments);
      useNotificationStore
        .getState()
        .addNotification("error", t("laundryFailed"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments });
    },
  });
}

/** Washes a single dirty garment, retaining the per-garment mutation API. */
export function useWashGarment() {
  return useLaundryMutation<string>((garmentId) => [garmentId], async (garmentId) =>
    washOwnedGarments([garmentId]),
  );
}

/** Washes every dirty garment, retaining the no-argument mutation API. */
export function useWashAllGarments() {
  return useLaundryMutation<void>(() => undefined, () => washOwnedGarments());
}
