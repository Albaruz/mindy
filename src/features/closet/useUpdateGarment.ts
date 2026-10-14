import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { GarmentSeason } from "@/types/garment";
import { GARMENTS_QUERY_KEY } from "./useClosetQuery";
import { LAUNDRY_QUERY_KEY } from "@/features/profile/useLaundryBasketQuery";
import type { GarmentFormInput } from "./useUploadGarment";
import { TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";

// Updates the editable tags of an existing garment. RLS guarantees the
// row belongs to the signed-in user; the explicit user_id filter is a
// second barrier so a future RLS regression cannot turn this into a
// cross-account write.
export function useUpdateGarment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      garmentId,
      input,
    }: {
      garmentId: string;
      input: GarmentFormInput;
    }): Promise<void> => {
      const supabase = createClient();
      const user = await requireUser(supabase, "You must be signed in to edit garments.");

      const season: GarmentSeason | null =
        input.season === "" ? null : input.season;
      const { error } = await supabase
        .from(TABLES.garments)
        .update({
          garment_type: input.garmentType === "" ? null : input.garmentType,
          style: input.style === "" ? null : input.style,
          cut_length: input.cutLength === "" ? null : input.cutLength,
          color: input.color === "" ? null : input.color,
          material: input.material === "" ? null : input.material,
          season,
          extra_tags: input.extraTags,
        })
        .eq("garment_id", garmentId)
        .eq(USER_ID_COLUMN, user.id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GARMENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: LAUNDRY_QUERY_KEY });
    },
  });
}
