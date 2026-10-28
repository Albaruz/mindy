import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ERROR_CODES } from "@/constants/errors";
import type { GarmentSeason } from "@/types/garment";
import type { GarmentFormInput } from "../../domain/garments/garmentForm";
import { COLUMNS, TABLES, USER_ID_COLUMN } from "@/constants/storage";
import { requireUser } from "@/lib/supabase/session";
import { AppError } from "@/lib/errors";
import { invalidateGarmentCaches } from "@/lib/garment/invalidateGarmentCaches";

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
      const user = await requireUser(supabase);

      const season: GarmentSeason | null =
        input.season === "" ? null : input.season;
      const { error } = await supabase
        .from(TABLES.garments)
        .update({
          garment_type: input.garmentType === "" ? null : input.garmentType,
          style: input.style === "" ? null : input.style,
          cut_length: input.cutLength === "" ? null : input.cutLength,
          styles: input.styles ?? (input.style === "" ? [] : [input.style]),
          cut_lengths: input.cuts ?? (input.cutLength === "" ? [] : [input.cutLength]),
          color: input.color === "" ? null : input.color,
          material: input.material === "" ? null : input.material,
          season,
          extra_tags: input.extraTags,
        })
        .eq(COLUMNS.garmentId, garmentId)
        .eq(USER_ID_COLUMN, user.id);
      if (error) {
        throw new AppError(ERROR_CODES.GARMENT_UPDATE_FAILED);
      }
    },
    onSuccess: () => {
      return invalidateGarmentCaches(queryClient);
    },
  });
}
